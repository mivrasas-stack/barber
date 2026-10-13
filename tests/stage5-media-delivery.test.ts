import { describe, expect, it, vi } from "vitest";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { getSignedUrl as GetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { InMemoryObjectStorage } from "@/infrastructure/media/in-memory-object-storage";
import { MediaDeliveryUrlResolver } from "@/infrastructure/media/media-delivery-url-resolver";
import { S3CompatibleObjectStorage } from "@/infrastructure/media/s3-compatible-object-storage";

describe("Stage 5D1 S3/R2 Storage & CDN Delivery", () => {
  it("1. resolves PUBLIC media through immutable CDN base without a signed URL", async () => {
    const storage = new InMemoryObjectStorage();
    const resolver = new MediaDeliveryUrlResolver(
      storage,
      "https://cdn.example.test/media/"
    );

    const result = await resolver.resolve(
      "media/v1/tenant a/asset/variants/v1/avatar.webp",
      "PUBLIC"
    );

    expect(result.url).toBe(
      "https://cdn.example.test/media/media/v1/tenant%20a/asset/variants/v1/avatar.webp"
    );
    expect(result.expiresAt).toBeNull();
    expect(result.cacheable).toBe(true);
  });

  it("2. resolves TENANT/PRIVATE media through short-lived signed reads", async () => {
    const now = new Date("2030-01-01T00:00:00.000Z");
    const storage = new InMemoryObjectStorage(() => now);
    const resolver = new MediaDeliveryUrlResolver(
      storage,
      "https://cdn.example.test",
      300
    );

    const result = await resolver.resolve(
      "media/v1/t1/a1/variants/v1/private.webp",
      "PRIVATE"
    );

    expect(result.url).toContain("storage.invalid/read/");
    expect(result.url).toContain("expires=");
    expect(result.expiresAt?.toISOString()).toBe("2030-01-01T00:05:00.000Z");
    expect(result.cacheable).toBe(false);
  });

  it("3. fails closed when PUBLIC media has no CDN base configured", async () => {
    const resolver = new MediaDeliveryUrlResolver(
      new InMemoryObjectStorage(),
      null
    );

    await expect(
      resolver.resolve("media/v1/t1/a1/variants/v1/public.webp", "PUBLIC")
    ).rejects.toThrow("MEDIA_PUBLIC_CDN_URL_REQUIRED");
  });

  it("4. creates provider-neutral signed PUT and GET URLs for S3-compatible storage", async () => {
    const client = { send: vi.fn() } as unknown as S3Client;
    const presign = vi.fn(async (_client, command, options) => {
      const kind = command.constructor.name.includes("Put") ? "put" : "get";
      return `https://signed.example.test/${kind}?ttl=${options?.expiresIn}`;
    }) as unknown as typeof GetSignedUrl;

    const storage = new S3CompatibleObjectStorage(
      {
        bucket: "media-test",
        region: "auto",
        endpoint: "https://account.r2.cloudflarestorage.com",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
      },
      { client, presign }
    );

    const upload = await storage.createSignedUpload({
      objectKey: "media/v1/t1/a1/source/file.jpg",
      contentType: "image/jpeg",
      maxBytes: 5_000_000,
      expiresInSeconds: 600,
    });
    const read = await storage.createSignedRead({
      objectKey: "media/v1/t1/a1/variants/v1/file.webp",
      expiresInSeconds: 300,
    });

    expect(upload.method).toBe("PUT");
    expect(upload.url).toContain("/put?ttl=600");
    expect(upload.requiredHeaders).toEqual({ "content-type": "image/jpeg" });
    expect(read.method).toBe("GET");
    expect(read.url).toContain("/get?ttl=300");
    expect(presign).toHaveBeenCalledTimes(2);
  });

  it("5. HEAD maps S3 metadata/checksum and treats 404 as absence", async () => {
    const checksumHex = "ab".repeat(32);
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        ContentLength: 123,
        ContentType: "image/webp",
        ChecksumSHA256: Buffer.from(checksumHex, "hex").toString("base64"),
        ETag: '"etag-1"',
        CacheControl: "public, max-age=31536000, immutable",
      })
      .mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } });

    const storage = new S3CompatibleObjectStorage(
      { bucket: "media-test", region: "auto" },
      { client: { send } as unknown as S3Client }
    );

    const head = await storage.headObject("media/v1/t1/a1/file.webp");
    expect(head).toEqual({
      objectKey: "media/v1/t1/a1/file.webp",
      sizeBytes: 123,
      contentType: "image/webp",
      checksumSha256: checksumHex,
      etag: "etag-1",
      cacheControl: "public, max-age=31536000, immutable",
    });

    expect(await storage.headObject("media/v1/missing.webp")).toBeNull();
    expect(send.mock.calls[0]?.[0]).toBeInstanceOf(HeadObjectCommand);
  });

  it("6. server-side derivative PUT computes SHA-256 and sends immutable metadata safely", async () => {
    const send = vi.fn().mockResolvedValue({ ETag: '"stored-etag"' });
    const storage = new S3CompatibleObjectStorage(
      { bucket: "media-test", region: "auto" },
      { client: { send } as unknown as S3Client }
    );

    const result = await storage.putObject({
      objectKey: "media/v1/t1/a1/variants/v1/avatar.webp",
      body: new Uint8Array([1, 2, 3, 4]),
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    });

    expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.etag).toBe("stored-etag");

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input.Metadata?.sha256).toBe(
      result.checksumSha256
    );
    expect((command as PutObjectCommand).input.CacheControl).toBe(
      "public, max-age=31536000, immutable"
    );
  });
});
