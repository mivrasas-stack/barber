import type { MediaPurpose } from "../domain/media";

export type ImageOutputFormat = "webp" | "avif";
export type ImageFit = "cover" | "inside";

export interface ImageVariantSpec {
  key: string;
  width: number;
  height?: number;
  fit: ImageFit;
  format: ImageOutputFormat;
  quality: number;
}

function formatsFor(
  prefix: string,
  width: number,
  options?: { height?: number; fit?: ImageFit }
): ImageVariantSpec[] {
  const fit = options?.fit ?? "inside";
  const suffix = options?.height ? `${width}x${options.height}` : `${width}w`;

  return [
    {
      key: `${prefix}-${suffix}-webp`,
      width,
      height: options?.height,
      fit,
      format: "webp",
      quality: 82,
    },
    {
      key: `${prefix}-${suffix}-avif`,
      width,
      height: options?.height,
      fit,
      format: "avif",
      quality: 55,
    },
  ];
}

export function getImageVariantSpecs(purpose: MediaPurpose): ImageVariantSpec[] {
  switch (purpose) {
    case "PROFESSIONAL_AVATAR":
      return [64, 128, 256, 512].flatMap((size) =>
        formatsFor("avatar", size, { height: size, fit: "cover" })
      );
    case "TENANT_LOGO":
      return [128, 256, 512].flatMap((size) =>
        formatsFor("logo", size, { height: size, fit: "inside" })
      );
    case "PORTFOLIO":
      return [320, 640, 1280, 1920].flatMap((width) =>
        formatsFor("portfolio", width)
      );
    case "SERVICE_IMAGE":
      return [320, 640, 1280].flatMap((width) =>
        formatsFor("service", width)
      );
    case "PRODUCT_IMAGE":
      return [320, 640, 1280].flatMap((width) =>
        formatsFor("product", width)
      );
    default:
      return [];
  }
}
