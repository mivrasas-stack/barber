import { createHash } from "node:crypto";
import type {
  CreateSignedReadInput,
  CreateSignedUploadInput,
  ObjectMetadata,
  ObjectStorage,
  PutObjectInput,
  SignedRead,
  SignedUpload,
  StoredObject,
} from "@/modules/media/application/object-storage.interface";

interface StoredRecord {
  metadata: ObjectMetadata & { checksumSha256: string };
  body: Uint8Array;
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new Error("MEDIA_STORAGE_ABORTED");
    error.name = "AbortError";
    throw error;
  }
}

function sha256(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

function validateObjectKey(objectKey: string): void {
  if (!objectKey || objectKey.startsWith("/") || objectKey.includes("\\")) {
    throw new Error("MEDIA_STORAGE_INVALID_OBJECT_KEY");
  }
}

export class InMemoryObjectStorage implements ObjectStorage {
  private readonly objects = new Map<string, StoredRecord>();

  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly signedUploadBaseUrl = "https://storage.invalid"
  ) {}

  async createSignedUpload(input: CreateSignedUploadInput): Promise<SignedUpload> {
    assertNotAborted(input.signal);
    validateObjectKey(input.objectKey);

    if (!input.contentType.trim()) {
      throw new Error("MEDIA_STORAGE_CONTENT_TYPE_REQUIRED");
    }
    if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes <= 0) {
      throw new Error("MEDIA_STORAGE_INVALID_MAX_BYTES");
    }
    if (!Number.isFinite(input.expiresInSeconds) || input.expiresInSeconds <= 0) {
      throw new Error("MEDIA_STORAGE_INVALID_EXPIRY");
    }

    const expiresAt = new Date(this.now().getTime() + input.expiresInSeconds * 1000);
    const url = new URL(
      `/upload/${encodeURIComponent(input.objectKey)}`,
      this.signedUploadBaseUrl
    );
    url.searchParams.set("expires", String(expiresAt.getTime()));

    return {
      url: url.toString(),
      method: "PUT",
      requiredHeaders: {
        "content-type": input.contentType,
        "x-media-max-bytes": String(input.maxBytes),
      },
      expiresAt,
    };
  }

  async createSignedRead(input: CreateSignedReadInput): Promise<SignedRead> {
    assertNotAborted(input.signal);
    validateObjectKey(input.objectKey);
    if (!Number.isFinite(input.expiresInSeconds) || input.expiresInSeconds <= 0) {
      throw new Error("MEDIA_STORAGE_INVALID_EXPIRY");
    }

    const expiresAt = new Date(this.now().getTime() + input.expiresInSeconds * 1000);
    const url = new URL(
      `/read/${encodeURIComponent(input.objectKey)}`,
      this.signedUploadBaseUrl
    );
    url.searchParams.set("expires", String(expiresAt.getTime()));

    return {
      url: url.toString(),
      method: "GET",
      expiresAt,
    };
  }

  async headObject(objectKey: string, signal?: AbortSignal): Promise<ObjectMetadata | null> {
    assertNotAborted(signal);
    validateObjectKey(objectKey);
    const record = this.objects.get(objectKey);
    return record ? { ...record.metadata } : null;
  }

  async getObject(objectKey: string, signal?: AbortSignal): Promise<StoredObject | null> {
    assertNotAborted(signal);
    validateObjectKey(objectKey);
    const record = this.objects.get(objectKey);
    if (!record) {
      return null;
    }

    return {
      ...record.metadata,
      body: new Uint8Array(record.body),
    };
  }

  async putObject(
    input: PutObjectInput
  ): Promise<ObjectMetadata & { checksumSha256: string }> {
    assertNotAborted(input.signal);
    validateObjectKey(input.objectKey);

    if (!input.contentType.trim()) {
      throw new Error("MEDIA_STORAGE_CONTENT_TYPE_REQUIRED");
    }

    const body = new Uint8Array(input.body);
    const checksumSha256 = input.checksumSha256 ?? sha256(body);

    if (input.checksumSha256 && input.checksumSha256 !== sha256(body)) {
      throw new Error("MEDIA_STORAGE_CHECKSUM_MISMATCH");
    }

    const metadata: ObjectMetadata & { checksumSha256: string } = {
      objectKey: input.objectKey,
      sizeBytes: body.byteLength,
      contentType: input.contentType,
      checksumSha256,
      etag: checksumSha256,
      cacheControl: input.cacheControl,
    };

    this.objects.set(input.objectKey, {
      metadata,
      body,
    });

    return { ...metadata };
  }

  async deleteObject(objectKey: string, signal?: AbortSignal): Promise<void> {
    assertNotAborted(signal);
    validateObjectKey(objectKey);
    this.objects.delete(objectKey);
  }
}
