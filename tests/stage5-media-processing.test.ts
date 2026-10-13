import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { SharpImageProcessor } from "@/infrastructure/media/sharp-image-processor";

async function jpeg(width = 1024, height = 1024): Promise<Uint8Array> {
  const body = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 80, b: 40 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
  return new Uint8Array(body);
}

describe("Stage 5C1 Sharp Image Processing", () => {
  it("1. detects real JPEG bytes and generates purpose-driven WebP/AVIF avatar variants", async () => {
    const processor = new SharpImageProcessor();
    const result = await processor.process({
      body: await jpeg(),
      expectedMimeType: "image/jpeg",
      purpose: "PROFESSIONAL_AVATAR",
    });

    expect(result.sourceFormat).toBe("jpeg");
    expect(result.sourceMimeType).toBe("image/jpeg");
    expect(result.sourceWidth).toBe(1024);
    expect(result.sourceHeight).toBe(1024);
    expect(result.variants).toHaveLength(8);
    expect(result.variants.map((variant) => variant.variantKey)).toEqual(
      expect.arrayContaining([
        "avatar-64x64-webp",
        "avatar-64x64-avif",
        "avatar-512x512-webp",
        "avatar-512x512-avif",
      ])
    );

    for (const variant of result.variants) {
      expect(variant.sizeBytes).toBeGreaterThan(0);
      expect(variant.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(["image/webp", "image/avif"]).toContain(variant.mimeType);
    }
  });

  it("2. strips source metadata from generated variants", async () => {
    const source = await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .jpeg()
      .withMetadata({ orientation: 6, density: 300 })
      .toBuffer();

    const sourceMetadata = await sharp(source).metadata();
    expect(sourceMetadata.exif).toBeDefined();

    const result = await new SharpImageProcessor().process({
      body: new Uint8Array(source),
      expectedMimeType: "image/jpeg",
      purpose: "PROFESSIONAL_AVATAR",
    });

    const outputMetadata = await sharp(result.variants[0].body).metadata();
    expect(outputMetadata.exif).toBeUndefined();
    expect(outputMetadata.icc).toBeUndefined();
  });

  it("3. rejects corrupt bytes", async () => {
    await expect(
      new SharpImageProcessor().process({
        body: new Uint8Array([1, 2, 3, 4, 5]),
        expectedMimeType: "image/jpeg",
        purpose: "PORTFOLIO",
      })
    ).rejects.toThrow("MEDIA_IMAGE_DECODE_FAILED");
  });

  it("4. detects MIME spoofing from decoded bytes", async () => {
    const png = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 1, g: 2, b: 3, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    await expect(
      new SharpImageProcessor().process({
        body: new Uint8Array(png),
        expectedMimeType: "image/jpeg",
        purpose: "PORTFOLIO",
      })
    ).rejects.toThrow("MEDIA_IMAGE_DECODED_TYPE_MISMATCH");
  });

  it("5. rejects extreme dimensions before variant generation", async () => {
    const wide = await sharp({
      create: {
        width: 8193,
        height: 2,
        channels: 3,
        background: { r: 1, g: 2, b: 3 },
      },
    })
      .png()
      .toBuffer();

    await expect(
      new SharpImageProcessor().process({
        body: new Uint8Array(wide),
        expectedMimeType: "image/png",
        purpose: "PORTFOLIO",
      })
    ).rejects.toThrow("MEDIA_IMAGE_DIMENSIONS_EXCEED_LIMIT");
  });

  it("6. never upscales a tiny source beyond its real dimensions", async () => {
    const result = await new SharpImageProcessor().process({
      body: await jpeg(40, 40),
      expectedMimeType: "image/jpeg",
      purpose: "PROFESSIONAL_AVATAR",
    });

    expect(result.variants).toHaveLength(2);
    expect(result.variants.every((variant) => variant.width <= 40)).toBe(true);
    expect(result.variants.every((variant) => variant.height <= 40)).toBe(true);
  });
});
