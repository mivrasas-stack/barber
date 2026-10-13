import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { InMemoryObjectStorage } from "@/infrastructure/media/in-memory-object-storage";

function checksum(body: Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

describe("Stage 5B2 Media Object Storage Contract", () => {
  it("1. creates deterministic short-lived signed upload metadata", async () => {
    const now = new Date("2030-01-01T00:00:00.000Z");
    const storage = new InMemoryObjectStorage(() => now);

    const signed = await storage.createSignedUpload({
      objectKey: "media/v1/tenant-1/asset-1/source/random.jpg",
      contentType: "image/jpeg",
      maxBytes: 5_000_000,
      expiresInSeconds: 300,
    });

    expect(signed.method).toBe("PUT");
    expect(signed.expiresAt.toISOString()).toBe("2030-01-01T00:05:00.000Z");
    expect(signed.requiredHeaders["content-type"]).toBe("image/jpeg");
    expect(signed.requiredHeaders["x-media-max-bytes"]).toBe("5000000");
    expect(signed.url).toContain("storage.invalid");
    expect(signed.url).not.toContain("tenant@example.com");
  });

  it("2. stores, heads and reads an object with deterministic checksum", async () => {
    const storage = new InMemoryObjectStorage();
    const body = new Uint8Array([1, 2, 3, 4]);

    const metadata = await storage.putObject({
      objectKey: "media/v1/t1/a1/source/file.jpg",
      body,
      contentType: "image/jpeg",
      cacheControl: "private, max-age=0",
    });

    expect(metadata.sizeBytes).toBe(4);
    expect(metadata.checksumSha256).toBe(checksum(body));

    const head = await storage.headObject(metadata.objectKey);
    expect(head).toEqual(metadata);

    const stored = await storage.getObject(metadata.objectKey);
    expect(stored?.body).toEqual(body);
  });

  it("3. returns a defensive copy of stored bytes", async () => {
    const storage = new InMemoryObjectStorage();
    await storage.putObject({
      objectKey: "media/v1/t1/a2/source/file.jpg",
      body: new Uint8Array([10, 20, 30]),
      contentType: "image/jpeg",
    });

    const first = await storage.getObject("media/v1/t1/a2/source/file.jpg");
    expect(first).not.toBeNull();
    first!.body[0] = 99;

    const second = await storage.getObject("media/v1/t1/a2/source/file.jpg");
    expect(second?.body[0]).toBe(10);
  });

  it("4. rejects a caller-provided checksum that does not match bytes", async () => {
    const storage = new InMemoryObjectStorage();

    await expect(
      storage.putObject({
        objectKey: "media/v1/t1/a3/source/file.jpg",
        body: new Uint8Array([1, 2, 3]),
        contentType: "image/jpeg",
        checksumSha256: "0".repeat(64),
      })
    ).rejects.toThrow("MEDIA_STORAGE_CHECKSUM_MISMATCH");
  });

  it("5. deletion is idempotent and removes subsequent reads", async () => {
    const storage = new InMemoryObjectStorage();
    const key = "media/v1/t1/a4/source/file.jpg";

    await storage.putObject({
      objectKey: key,
      body: new Uint8Array([1]),
      contentType: "image/jpeg",
    });

    await storage.deleteObject(key);
    await storage.deleteObject(key);

    expect(await storage.headObject(key)).toBeNull();
    expect(await storage.getObject(key)).toBeNull();
  });

  it("6. honors an already-aborted signal", async () => {
    const storage = new InMemoryObjectStorage();
    const controller = new AbortController();
    controller.abort();

    await expect(
      storage.headObject("media/v1/t1/a5/source/file.jpg", controller.signal)
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("7. rejects unsafe or malformed object keys", async () => {
    const storage = new InMemoryObjectStorage();

    await expect(
      storage.createSignedUpload({
        objectKey: "/absolute/path.jpg",
        contentType: "image/jpeg",
        maxBytes: 100,
        expiresInSeconds: 60,
      })
    ).rejects.toThrow("MEDIA_STORAGE_INVALID_OBJECT_KEY");

    await expect(
      storage.createSignedUpload({
        objectKey: "media\\windows\\path.jpg",
        contentType: "image/jpeg",
        maxBytes: 100,
        expiresInSeconds: 60,
      })
    ).rejects.toThrow("MEDIA_STORAGE_INVALID_OBJECT_KEY");
  });
});
