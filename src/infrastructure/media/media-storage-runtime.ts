import type { ObjectStorage } from "@/modules/media/application/object-storage.interface";
import { env } from "@/shared/config/env";
import { InMemoryObjectStorage } from "./in-memory-object-storage";
import { MediaDeliveryUrlResolver } from "./media-delivery-url-resolver";
import { S3CompatibleObjectStorage } from "./s3-compatible-object-storage";

let storageSingleton: ObjectStorage | null = null;
let resolverSingleton: MediaDeliveryUrlResolver | null = null;

function buildStorage(): ObjectStorage {
  if (env.MEDIA_STORAGE_PROVIDER === "memory") {
    if (env.NODE_ENV === "production") {
      throw new Error("MEDIA_STORAGE_PROVIDER_MEMORY_NOT_ALLOWED_IN_PRODUCTION");
    }
    return new InMemoryObjectStorage();
  }

  if (!env.MEDIA_STORAGE_BUCKET) {
    throw new Error("MEDIA_STORAGE_BUCKET_REQUIRED");
  }

  const hasAccessKey = Boolean(env.MEDIA_STORAGE_ACCESS_KEY_ID);
  const hasSecretKey = Boolean(env.MEDIA_STORAGE_SECRET_ACCESS_KEY);
  if (hasAccessKey !== hasSecretKey) {
    throw new Error("MEDIA_STORAGE_CREDENTIALS_INCOMPLETE");
  }

  if (
    env.MEDIA_STORAGE_ENDPOINT &&
    (!env.MEDIA_STORAGE_ACCESS_KEY_ID || !env.MEDIA_STORAGE_SECRET_ACCESS_KEY)
  ) {
    throw new Error("MEDIA_STORAGE_ENDPOINT_CREDENTIALS_REQUIRED");
  }

  return new S3CompatibleObjectStorage({
    bucket: env.MEDIA_STORAGE_BUCKET,
    region: env.MEDIA_STORAGE_REGION,
    endpoint: env.MEDIA_STORAGE_ENDPOINT,
    accessKeyId: env.MEDIA_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.MEDIA_STORAGE_SECRET_ACCESS_KEY,
  });
}

export function getMediaObjectStorage(): ObjectStorage {
  storageSingleton ??= buildStorage();
  return storageSingleton;
}

export function getMediaDeliveryUrlResolver(): MediaDeliveryUrlResolver {
  resolverSingleton ??= new MediaDeliveryUrlResolver(
    getMediaObjectStorage(),
    env.MEDIA_PUBLIC_CDN_URL,
    env.MEDIA_PRIVATE_URL_TTL_SECONDS
  );
  return resolverSingleton;
}

export function assertDirectMediaUploadConfigured(): void {
  if (env.MEDIA_STORAGE_PROVIDER === "memory") {
    throw new Error("MEDIA_DIRECT_UPLOAD_STORAGE_NOT_CONFIGURED");
  }
}

export function resetMediaStorageRuntimeForTests(): void {
  storageSingleton = null;
  resolverSingleton = null;
}
