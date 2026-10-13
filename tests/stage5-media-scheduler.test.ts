import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "@/infrastructure/database/client";
import { mediaAssets } from "@/infrastructure/database/schema/media";
import { DrizzleMediaRepository } from "@/modules/media/infrastructure/drizzle-media.repository";
import {
  MediaProcessingScheduler,
  type MediaProcessingDiscoveryRepository,
  type MediaProcessingDispatcher,
} from "@/infrastructure/media/media-processing-scheduler";
import type { MediaLogger } from "@/infrastructure/media/media-logger";

describe("Stage 5C2-B2 Durable Media Processing Scheduler", () => {
  const assetIds: string[] = [];

  async function insertAsset(
    overrides: Partial<typeof mediaAssets.$inferInsert> = {}
  ): Promise<string> {
    const id = randomUUID();
    assetIds.push(id);

    await db.insert(mediaAssets).values({
      id,
      tenantId: null,
      ownerUserId: null,
      mediaKind: "IMAGE",
      purpose: "PORTFOLIO",
      visibility: "PUBLIC",
      sourceObjectKey: `media/v1/global/${id}/source/file.jpg`,
      mimeType: "image/jpeg",
      status: "UPLOADED",
      processingAttempts: 0,
      processingMaxAttempts: 8,
      nextProcessingAttemptAt: new Date(Date.now() - 60_000),
      ...overrides,
    });

    return id;
  }

  afterEach(async () => {
    if (assetIds.length > 0) {
      await db
        .delete(mediaAssets)
        .where(inArray(mediaAssets.id, assetIds));
      assetIds.length = 0;
    }
  });

  it("1. PostgreSQL discovery returns only assets that are due and recoverable", async () => {
    const dueUploaded = await insertAsset({
      status: "UPLOADED",
      nextProcessingAttemptAt: new Date(Date.now() - 60_000),
    });
    const dueFailed = await insertAsset({
      status: "FAILED",
      processingAttempts: 2,
      nextProcessingAttemptAt: new Date(Date.now() - 60_000),
    });
    const expiredLease = await insertAsset({
      status: "PROCESSING",
      processingAttempts: 1,
      processingLeaseId: "expired-lease",
      processingLockedAt: new Date(Date.now() - 120_000),
      processingLockedBy: "dead-worker",
      processingLockExpiresAt: new Date(Date.now() - 60_000),
    });

    const futureFailed = await insertAsset({
      status: "FAILED",
      processingAttempts: 2,
      nextProcessingAttemptAt: new Date(Date.now() + 60_000),
    });
    const liveLease = await insertAsset({
      status: "PROCESSING",
      processingAttempts: 1,
      processingLeaseId: "live-lease",
      processingLockedAt: new Date(),
      processingLockedBy: "live-worker",
      processingLockExpiresAt: new Date(Date.now() + 60_000),
    });
    const maxAttempts = await insertAsset({
      status: "FAILED",
      processingAttempts: 8,
      processingMaxAttempts: 8,
      nextProcessingAttemptAt: new Date(Date.now() - 60_000),
    });
    const ready = await insertAsset({
      status: "READY",
      nextProcessingAttemptAt: new Date(Date.now() - 60_000),
    });

    const found = await new DrizzleMediaRepository()
      .findProcessableAssetIds(50);

    expect(found).toEqual(
      expect.arrayContaining([dueUploaded, dueFailed, expiredLease])
    );
    expect(found).not.toContain(futureFailed);
    expect(found).not.toContain(liveLease);
    expect(found).not.toContain(maxAttempts);
    expect(found).not.toContain(ready);
  });

  it("2. discovery limit is validated and enforced", async () => {
    const repository = new DrizzleMediaRepository();

    await expect(repository.findProcessableAssetIds(0)).rejects.toThrow(
      "MEDIA_PROCESSING_DISCOVERY_LIMIT_INVALID"
    );
    await expect(repository.findProcessableAssetIds(501)).rejects.toThrow(
      "MEDIA_PROCESSING_DISCOVERY_LIMIT_INVALID"
    );

    await insertAsset();
    await insertAsset();

    const found = await repository.findProcessableAssetIds(1);
    expect(found).toHaveLength(1);
  });

  it("3. one scheduler tick enqueues every discovered asset", async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    const repository: MediaProcessingDiscoveryRepository = {
      async findProcessableAssetIds(limit) {
        expect(limit).toBe(25);
        return ids;
      },
    };
    const enqueued: string[] = [];
    const dispatcher: MediaProcessingDispatcher = {
      async enqueue(assetId) {
        enqueued.push(assetId);
        return { jobId: `job-${assetId}` };
      },
    };

    const result = await new MediaProcessingScheduler(
      repository,
      dispatcher,
      {
        batchSize: 25,
        pollIntervalMs: 100,
        logger: silentLogger(),
      }
    ).tick();

    expect(result).toEqual({
      discovered: 3,
      enqueued: 3,
      failed: 0,
    });
    expect(enqueued).toEqual(ids);
  });

  it("4. one Redis enqueue failure does not prevent remaining assets from dispatching", async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    const attempted: string[] = [];
    const repository: MediaProcessingDiscoveryRepository = {
      async findProcessableAssetIds() {
        return ids;
      },
    };
    const dispatcher: MediaProcessingDispatcher = {
      async enqueue(assetId) {
        attempted.push(assetId);
        if (assetId === ids[1]) {
          throw new Error("redis temporarily unavailable");
        }
        return { jobId: `job-${assetId}` };
      },
    };

    const result = await new MediaProcessingScheduler(
      repository,
      dispatcher,
      { logger: silentLogger() }
    ).tick();

    expect(attempted).toEqual(ids);
    expect(result).toEqual({
      discovered: 3,
      enqueued: 2,
      failed: 1,
    });
  });

  it("5. scheduler sanitizes dispatch errors before logging them", async () => {
    const assetId = randomUUID();
    const logged: Record<string, unknown>[] = [];
    const logger: MediaLogger = {
      info() {},
      warn(_message, fields) {
        logged.push(fields ?? {});
      },
      error() {},
    };
    const repository: MediaProcessingDiscoveryRepository = {
      async findProcessableAssetIds() {
        return [assetId];
      },
    };
    const dispatcher: MediaProcessingDispatcher = {
      async enqueue() {
        throw new Error(
          "Bearer super-secret password=hidden postgresql://user:pass@db/private"
        );
      },
    };

    await new MediaProcessingScheduler(repository, dispatcher, {
      logger,
    }).tick();

    const serialized = JSON.stringify(logged);
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("password=hidden");
    expect(serialized).not.toContain("user:pass");
  });

  it("6. run loop survives discovery outages and stops when aborted", async () => {
    let attempts = 0;
    const controller = new AbortController();
    const repository: MediaProcessingDiscoveryRepository = {
      async findProcessableAssetIds() {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("temporary database outage");
        }
        controller.abort();
        return [];
      },
    };
    const dispatcher: MediaProcessingDispatcher = {
      async enqueue(assetId) {
        return { jobId: assetId };
      },
    };

    await new MediaProcessingScheduler(repository, dispatcher, {
      pollIntervalMs: 100,
      logger: silentLogger(),
    }).run(controller.signal);

    expect(attempts).toBe(2);
  });

  it("7. abort interrupts the scheduler sleep promptly", async () => {
    let ticks = 0;
    const controller = new AbortController();
    const repository: MediaProcessingDiscoveryRepository = {
      async findProcessableAssetIds() {
        ticks += 1;
        return [];
      },
    };
    const dispatcher: MediaProcessingDispatcher = {
      async enqueue(assetId) {
        return { jobId: assetId };
      },
    };

    const scheduler = new MediaProcessingScheduler(repository, dispatcher, {
      pollIntervalMs: 5_000,
      logger: silentLogger(),
    });

    const started = Date.now();
    const running = scheduler.run(controller.signal);
    setTimeout(() => controller.abort(), 50);
    await running;

    expect(Date.now() - started).toBeLessThan(1_000);
    expect(ticks).toBe(1);
  });
});

function silentLogger(): MediaLogger {
  return {
    info() {},
    warn() {},
    error() {},
  };
}
