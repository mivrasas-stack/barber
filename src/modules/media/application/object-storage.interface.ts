export interface CreateSignedUploadInput {
  objectKey: string;
  contentType: string;
  maxBytes: number;
  expiresInSeconds: number;
  signal?: AbortSignal;
}

export interface CreateSignedReadInput {
  objectKey: string;
  expiresInSeconds: number;
  signal?: AbortSignal;
}

export interface SignedUpload {
  url: string;
  method: "PUT";
  requiredHeaders: Record<string, string>;
  expiresAt: Date;
}

export interface SignedRead {
  url: string;
  method: "GET";
  expiresAt: Date;
}

export interface ObjectMetadata {
  objectKey: string;
  sizeBytes: number;
  contentType: string;
  checksumSha256: string | null;
  etag: string;
  cacheControl?: string;
}

export interface StoredObject extends ObjectMetadata {
  body: Uint8Array;
  checksumSha256: string;
}

export interface PutObjectInput {
  objectKey: string;
  body: Uint8Array;
  contentType: string;
  cacheControl?: string;
  checksumSha256?: string;
  signal?: AbortSignal;
}

export interface ObjectStorage {
  createSignedUpload(input: CreateSignedUploadInput): Promise<SignedUpload>;
  createSignedRead(input: CreateSignedReadInput): Promise<SignedRead>;
  headObject(objectKey: string, signal?: AbortSignal): Promise<ObjectMetadata | null>;
  getObject(objectKey: string, signal?: AbortSignal): Promise<StoredObject | null>;
  putObject(input: PutObjectInput): Promise<ObjectMetadata & { checksumSha256: string }>;
  deleteObject(objectKey: string, signal?: AbortSignal): Promise<void>;
}
