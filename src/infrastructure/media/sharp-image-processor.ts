import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import type {
  ImageProcessor,
  ProcessImageInput,
  ProcessImageResult,
  ProcessedImageVariant,
} from "@/modules/media/application/image-processor.interface";
import {
  getImageVariantSpecs,
  type ImageVariantSpec,
} from "@/modules/media/application/media-variant-policy";
import { ValidationError } from "@/shared/errors/app-error";

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_DIMENSION = 8_192;

const FORMAT_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

function checksum(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

function normalizedMime(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function assertSafeMetadata(
  metadata: Metadata,
  expectedMimeType: string
): asserts metadata is Metadata & {
  format: "jpeg" | "png" | "webp" | "avif";
  width: number;
  height: number;
} {
  const format = metadata.format;
  const width = metadata.width;
  const height = metadata.height;

  if (!format || !FORMAT_TO_MIME[format]) {
    throw new ValidationError("MEDIA_IMAGE_FORMAT_NOT_ALLOWED");
  }

  if (!width || !height || width <= 0 || height <= 0) {
    throw new ValidationError("MEDIA_IMAGE_DIMENSIONS_INVALID");
  }

  if (
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    width * height > MAX_INPUT_PIXELS
  ) {
    throw new ValidationError("MEDIA_IMAGE_DIMENSIONS_EXCEED_LIMIT");
  }

  if (FORMAT_TO_MIME[format] !== normalizedMime(expectedMimeType)) {
    throw new ValidationError("MEDIA_IMAGE_DECODED_TYPE_MISMATCH");
  }
}

function specsForSource(
  specs: ImageVariantSpec[],
  sourceWidth: number,
  sourceHeight: number
): ImageVariantSpec[] {
  const eligible = specs.filter((spec) => {
    if (spec.height) {
      return spec.width <= sourceWidth && spec.height <= sourceHeight;
    }
    return spec.width <= sourceWidth;
  });

  if (eligible.length > 0) return eligible;

  const formats = new Map<string, ImageVariantSpec>();
  for (const spec of specs) {
    if (!formats.has(spec.format)) {
      formats.set(spec.format, spec);
    }
  }
  return Array.from(formats.values());
}

export class SharpImageProcessor implements ImageProcessor {
  async process(input: ProcessImageInput): Promise<ProcessImageResult> {
    let metadata: Metadata;

    try {
      metadata = await sharp(input.body, {
        animated: false,
        limitInputPixels: MAX_INPUT_PIXELS,
      }).metadata();
    } catch {
      throw new ValidationError("MEDIA_IMAGE_DECODE_FAILED");
    }

    assertSafeMetadata(metadata, input.expectedMimeType);

    const specs = specsForSource(
      getImageVariantSpecs(input.purpose),
      metadata.width,
      metadata.height
    );

    if (specs.length === 0) {
      throw new ValidationError("MEDIA_IMAGE_PURPOSE_NOT_PROCESSABLE");
    }

    const variants: ProcessedImageVariant[] = [];

    for (const spec of specs) {
      let pipeline = sharp(input.body, {
        animated: false,
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate()
        .toColourspace("srgb")
        .resize({
          width: spec.width,
          height: spec.height,
          fit: spec.fit,
          withoutEnlargement: true,
        });

      pipeline =
        spec.format === "webp"
          ? pipeline.webp({ quality: spec.quality })
          : pipeline.avif({ quality: spec.quality });

      let output: Buffer;
      let outputMetadata: Metadata;
      try {
        output = await pipeline.toBuffer();
        outputMetadata = await sharp(output).metadata();
      } catch {
        throw new ValidationError("MEDIA_IMAGE_VARIANT_PROCESSING_FAILED");
      }

      if (!outputMetadata.width || !outputMetadata.height) {
        throw new ValidationError("MEDIA_IMAGE_VARIANT_DIMENSIONS_MISSING");
      }

      const bytes = new Uint8Array(output);
      variants.push({
        variantKey: spec.key,
        body: bytes,
        mimeType: spec.format === "webp" ? "image/webp" : "image/avif",
        width: outputMetadata.width,
        height: outputMetadata.height,
        sizeBytes: bytes.byteLength,
        checksumSha256: checksum(bytes),
      });
    }

    return {
      sourceFormat: metadata.format,
      sourceMimeType: FORMAT_TO_MIME[metadata.format],
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      variants,
    };
  }
}
