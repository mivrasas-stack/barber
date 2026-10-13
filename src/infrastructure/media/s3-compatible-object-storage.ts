import { createHash } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

export interface S3CompatibleObjectStorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
}

type Presign = typeof getSignedUrl;

function sha256(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

function validateObjectKey(objectKey: string): void {
  if (!objectKey || objectKey.startsWith("/") || objectKey.includes("\\")) {
    throw new Error("MEDIA_STORAGE_INVALID_OBJECT_KEY");
  }
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    value.name === "NotFound" ||
    value.name === "NoSuchKey" ||
    value.$metadata?.httpStatusCode === 404
  );
}

function decodeChecksum(value?: string): string | null {
  if (!value) return null;
  try {
    const hex = Buffer.from(value, "base64").toString("hex");
    return /^[a-f0-9]{64}$/i.test(hex) ? hex : null;
  } catch {
    return null;
  }
}

export class S3CompatibleObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly presign: Presign;

  constructor(
    private readonly config: S3CompatibleObjectStorageConfig,
    dependencies: { client?: S3Client; presign?: Presign } = {}
  ) {
    if (!config.bucket.trim()) throw new Error("MEDIA_STORAGE_BUCKET_REQUIRED");
    if (!config.region.trim()) throw new Error("MEDIA_STORAGE_REGION_REQUIRED");

    const clientConfig: S3ClientConfig = {
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
    };

    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    this.client = dependencies.client ?? new S3Client(clientConfig);
    this.presign = dependencies.presign ?? getSignedUrl;
  }

  async createSignedUpload(
    input: CreateSignedUploadInput
  ): Promise<SignedUpload> {
    validateObjectKey(input.objectKey);
    if (!input.contentType.trim()) {
      throw new Error("MEDIA_STORAGE_CONTENT_TYPE_REQUIRED");
    }
    if (!Number.isSafeInteger(input.maxBytes) || input.maxBytes <= 0) {
      throw new Error("MEDIA_STORAGE_INVALID_MAX_BYTES");
    }
    if (!Number.isInteger(input.expiresInSeconds) || input.expiresInSeconds <= 0) {
      throw new Error("MEDIA_STORAGE_INVALID_EXPIRY");
    }

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: input.objectKey,
      ContentType: input.contentType,
    });
    const url = await this.presign(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });

    return {
      url,
      method: "PUT",
      requiredHeaders: { "content-type": input.contentType },
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async createSignedRead(input: CreateSignedReadInput): Promise<SignedRead> {
    validateObjectKey(input.objectKey);
    if (!Number.isInteger(input.expiresInSeconds) || input.expiresInSeconds <= 0) {
      throw new Error("MEDIA_STORAGE_INVALID_EXPIRY");
    }

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: input.objectKey,
    });
    const url = await this.presign(this.client, command, {
      expiresIn: input.expiresInSeconds,
    });

    return {
      url,
      method: "GET",
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
    };
  }

  async headObject(
    objectKey: string,
    signal?: AbortSignal
  ): Promise<ObjectMetadata | null> {
    validateObjectKey(objectKey);
    try {
      const output = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
          ChecksumMode: "ENABLED",
        }),
        { abortSignal: signal }
      );

      const metadataChecksum = output.Metadata?.sha256;
      const checksumSha256 =
        metadataChecksum && /^[a-f0-9]{64}$/i.test(metadataChecksum)
          ? metadataChecksum
          : decodeChecksum(output.ChecksumSHA256);

      return {
        objectKey,
        sizeBytes: output.ContentLength ?? 0,
        contentType: output.ContentType ?? "application/octet-stream",
        checksumSha256,
        etag: output.ETag?.replace(/^"|"$/g, "") ?? "",
        cacheControl: output.CacheControl,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async getObject(
    objectKey: string,
    signal?: AbortSignal
  ): Promise<StoredObject | null> {
    validateObjectKey(objectKey);
    try {
      const output = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: objectKey,
          ChecksumMode: "ENABLED",
        }),
        { abortSignal: signal }
      );

      if (!output.Body || typeof output.Body.transformToByteArray !== "function") {
        throw new Error("MEDIA_STORAGE_BODY_UNAVAILABLE");
      }

      const body = new Uint8Array(await output.Body.transformToByteArray());
      const checksumSha256 = sha256(body);

      return {
        objectKey,
        body,
        sizeBytes: body.byteLength,
        contentType: output.ContentType ?? "application/octet-stream",
        checksumSha256,
        etag: output.ETag?.replace(/^"|"$/g, "") ?? checksumSha256,
        cacheControl: output.CacheControl,
      };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async putObject(
    input: PutObjectInput
  ): Promise<ObjectMetadata & { checksumSha256: string }> {
    validateObjectKey(input.objectKey);
    const checksumSha256 = sha256(input.body);
    if (
      input.checksumSha256 &&
      input.checksumSha256.toLowerCase() !== checksumSha256
    ) {
      throw new Error("MEDIA_STORAGE_CHECKSUM_MISMATCH");
    }

    const output = await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl,
        Metadata: { sha256: checksumSha256 },
        ChecksumSHA256: Buffer.from(checksumSha256, "hex").toString("base64"),
      }),
      { abortSignal: input.signal }
    );

    return {
      objectKey: input.objectKey,
      sizeBytes: input.body.byteLength,
      contentType: input.contentType,
      checksumSha256,
      etag: output.ETag?.replace(/^"|"$/g, "") ?? checksumSha256,
      cacheControl: input.cacheControl,
    };
  }

  async deleteObject(objectKey: string, signal?: AbortSignal): Promise<void> {
    validateObjectKey(objectKey);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: objectKey,
      }),
      { abortSignal: signal }
    );
  }
}
