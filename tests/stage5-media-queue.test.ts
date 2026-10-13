import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import {
  BullMQMediaProcessingQueue,
  BullMQMediaProcessingWorker,
  MEDIA_PROCESSING_JOB_NAME,
  type MediaAssetProcessor,
} from "@/infrastructure/media/bullmq-media-processing";
import { SilentMediaLogger } from "@/infrastructure/media/media-logger";
import {
  closeRedisConnections,
  getRedisWorkerClient,
} from "@/infrastructure/redis/redis-connection-factory";

async function waitForJobState(
  queue: BullMQMediaProcessingQueue,
  jobId: string,
  expected: string,
  timeoutMs = 5000
): Promise<void> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const job = await queue.getQueue().getJob(jobId);
    if (job && (await job.getState()) === expected) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(`JOB_STATE_TIMEOUT_${expected}`);
}

describe("Stage 5C2-B BullMQ Media Processing Transport", () => {
  let redis: Redis;

  beforeAll(() => {
    redis = getRedisWorkerClient();
  });

  afterAll(async () => {
    await closeRedisConnections();
  });

  it("1. enqueues a stable UUID job with bounded retention and one BullMQ attempt", async () => {
    const queueName = `test-media-${randomUUID()}`;
    const prefix = "bp:test:media";
    const queue = new BullMQMediaProcessingQueue({
      queueName,
      prefix,
      connection: redis,
    });
    const assetId = randomUUID();

    try {
      const result = await queue.enqueue(assetId);
      const expectedJobId =
        BullMQMediaProcessingQueue.formatJobId(assetId);

      expect(result.jobId).toBe(expectedJobId);

      const job = await queue.getQueue().getJob(expectedJobId);
      expect(job).toBeDefined();
      expect(job?.name).toBe(MEDIA_PROCESSING_JOB_NAME);
      expect(job?.data).toEqual({ assetId });
      expect(job?.opts.attempts).toBe(1);

      expect(queue.getQueue().defaultJobOptions.removeOnComplete).toEqual({
        age: 86_400,
        count: 5_000,
      });
      expect(queue.getQueue().defaultJobOptions.removeOnFail).toEqual({
        age: 604_800,
        count: 5_000,
      });
    } finally {
      await queue.getQueue().obliterate({ force: true });
      await queue.close();
    }
  });

  it("2. duplicate enqueue of the same asset does not create parallel retained jobs", async () => {
    const queue = new BullMQMediaProcessingQueue({
      queueName: `test-media-dedupe-${randomUUID()}`,
      prefix: "bp:test:media",
      connection: redis,
    });
    const assetId = randomUUID();

    try {
      await Promise.all(
        Array.from({ length: 20 }, () => queue.enqueue(assetId))
      );

      const count = await queue
        .getQueue()
        .getJobCountByTypes(
          "waiting",
          "active",
          "completed",
          "failed",
          "delayed"
        );

      expect(count).toBe(1);
    } finally {
      await queue.getQueue().obliterate({ force: true });
      await queue.close();
    }
  });

  it("3. worker consumes one asset job and preserves the injected worker identity", async () => {
    const queueName = `test-media-worker-${randomUUID()}`;
    const prefix = "bp:test:media";
    const queue = new BullMQMediaProcessingQueue({
      queueName,
      prefix,
      connection: redis,
    });
    const calls: Array<{ assetId: string; workerId: string }> = [];

    const processor: MediaAssetProcessor = {
      async processAsset(assetId, workerId) {
        calls.push({ assetId, workerId });
        return {
          claimed: true,
          settled: true,
          assetId,
          status: "READY",
          variantCount: 4,
        };
      },
    };

    const worker = new BullMQMediaProcessingWorker({
      processor,
      queueName,
      prefix,
      workerConnection: redis,
      workerId: "test-media-worker",
      logger: new SilentMediaLogger(),
      concurrency: 1,
      autoStart: true,
    });

    const assetId = randomUUID();

    try {
      await worker.getWorker()?.waitUntilReady();
      const { jobId } = await queue.enqueue(assetId);
      await waitForJobState(queue, jobId, "completed");

      expect(calls).toEqual([
        { assetId, workerId: "test-media-worker" },
      ]);
    } finally {
      await worker.close();
      await queue.getQueue().obliterate({ force: true });
      await queue.close();
    }
  });

  it("4. invalid job payload is unrecoverable and never reaches the processor", async () => {
    let called = false;
    const processor: MediaAssetProcessor = {
      async processAsset(assetId) {
        called = true;
        return {
          claimed: false,
          settled: false,
          assetId,
          reason: "NOT_ELIGIBLE",
        };
      },
    };

    const worker = new BullMQMediaProcessingWorker({
      processor,
      logger: new SilentMediaLogger(),
    });

    await expect(
      worker.processJobData({ assetId: "not-a-uuid" })
    ).rejects.toMatchObject({
      name: "UnrecoverableError",
      message: "MEDIA_PROCESSING_JOB_INVALID",
    });

    expect(called).toBe(false);
  });

  it("5. unexpected processor errors are sanitized before BullMQ can persist them", async () => {
    const processor: MediaAssetProcessor = {
      async processAsset() {
        throw new Error(
          "Bearer raw-secret password=hidden postgresql://user:pass@db/internal"
        );
      },
    };

    const worker = new BullMQMediaProcessingWorker({
      processor,
      logger: new SilentMediaLogger(),
    });

    let caught: Error | undefined;
    try {
      await worker.processJobData({ assetId: randomUUID() });
    } catch (error) {
      caught = error as Error;
    }

    expect(caught).toBeDefined();
    expect(caught?.message).toContain("[REDACTED]");
    expect(caught?.message).not.toContain("raw-secret");
    expect(caught?.message).not.toContain("password=hidden");
    expect(caught?.message).not.toContain("user:pass");
  });

  it("6. invalid producer asset IDs fail before Redis enqueue", async () => {
    const queue = new BullMQMediaProcessingQueue({
      queueName: `test-media-invalid-${randomUUID()}`,
      prefix: "bp:test:media",
      connection: redis,
    });

    try {
      await expect(queue.enqueue("")).rejects.toThrow(
        "MEDIA_PROCESSING_ASSET_ID_INVALID"
      );
      await expect(queue.enqueue("asset:unsafe")).rejects.toThrow(
        "MEDIA_PROCESSING_ASSET_ID_INVALID"
      );

      const count = await queue.getQueue().count();
      expect(count).toBe(0);
    } finally {
      await queue.getQueue().obliterate({ force: true });
      await queue.close();
    }
  });

  it("7. worker concurrency is bounded", () => {
    const processor: MediaAssetProcessor = {
      async processAsset(assetId) {
        return {
          claimed: false,
          settled: false,
          assetId,
          reason: "NOT_ELIGIBLE",
        };
      },
    };

    const worker = new BullMQMediaProcessingWorker({
      processor,
      logger: new SilentMediaLogger(),
    });

    expect(() => worker.startWorker(redis, 0)).toThrow(
      "MEDIA_PROCESSING_WORKER_CONCURRENCY_INVALID"
    );
    expect(() => worker.startWorker(redis, 33)).toThrow(
      "MEDIA_PROCESSING_WORKER_CONCURRENCY_INVALID"
    );
  });
});
