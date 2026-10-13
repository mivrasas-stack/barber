import type { ObjectStorage } from "@/modules/media/application/object-storage.interface";
import type { MediaVisibility } from "@/modules/media/domain/media";

export interface ResolvedMediaUrl {
  url: string;
  expiresAt: Date | null;
  cacheable: boolean;
}

function encodeObjectKey(objectKey: string): string {
  if (!objectKey || objectKey.startsWith("/") || objectKey.includes("\\")) {
    throw new Error("MEDIA_STORAGE_INVALID_OBJECT_KEY");
  }
  return objectKey.split("/").map(encodeURIComponent).join("/");
}

export class MediaDeliveryUrlResolver {
  private readonly publicBaseUrl: URL | null;

  constructor(
    private readonly objectStorage: ObjectStorage,
    publicBaseUrl?: string | null,
    private readonly privateUrlTtlSeconds = 300
  ) {
    this.publicBaseUrl = publicBaseUrl ? new URL(publicBaseUrl) : null;
    if (
      !Number.isInteger(privateUrlTtlSeconds) ||
      privateUrlTtlSeconds < 30 ||
      privateUrlTtlSeconds > 3600
    ) {
      throw new Error("MEDIA_PRIVATE_URL_TTL_INVALID");
    }
  }

  async resolve(
    objectKey: string,
    visibility: MediaVisibility
  ): Promise<ResolvedMediaUrl> {
    const encodedKey = encodeObjectKey(objectKey);

    if (visibility === "PUBLIC") {
      if (!this.publicBaseUrl) {
        throw new Error("MEDIA_PUBLIC_CDN_URL_REQUIRED");
      }

      const base = this.publicBaseUrl.toString().replace(/\/$/, "");
      return {
        url: `${base}/${encodedKey}`,
        expiresAt: null,
        cacheable: true,
      };
    }

    const signed = await this.objectStorage.createSignedRead({
      objectKey,
      expiresInSeconds: this.privateUrlTtlSeconds,
    });

    return {
      url: signed.url,
      expiresAt: signed.expiresAt,
      cacheable: false,
    };
  }
}
