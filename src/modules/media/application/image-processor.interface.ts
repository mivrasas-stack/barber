import type { MediaPurpose } from "../domain/media";

export interface ProcessImageInput {
  body: Uint8Array;
  expectedMimeType: string;
  purpose: MediaPurpose;
}

export interface ProcessedImageVariant {
  variantKey: string;
  body: Uint8Array;
  mimeType: "image/webp" | "image/avif";
  width: number;
  height: number;
  sizeBytes: number;
  checksumSha256: string;
}

export interface ProcessImageResult {
  sourceFormat: "jpeg" | "png" | "webp" | "avif";
  sourceMimeType: string;
  sourceWidth: number;
  sourceHeight: number;
  variants: ProcessedImageVariant[];
}

export interface ImageProcessor {
  process(input: ProcessImageInput): Promise<ProcessImageResult>;
}
