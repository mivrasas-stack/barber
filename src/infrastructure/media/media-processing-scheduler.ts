import { sanitizeAndBoundError } from "@/infrastructure/outbox/outbox-sanitizer";
import { env } from "@/shared/config/env";
import type { MediaLogger } from "./media-logger";
import { JsonMediaLogger } from "./media-logger";

export interface MediaProcessingDiscoveryRepository {
  findProcessableAssetIds(limit: number): Promise<string[]>;
}

export interface MediaProcessingDispatcher {
  enqueue(assetId: string): Promise<{ jobId: string }>;
}

export interface MediaProcessingSchedulerOptions {
  batchSize?: number;
  pollIntervalMs?: number;
  logger?: MediaLogger;
}

export interface MediaProcessingSchedulerTickResult {
  discovered: number;
  enqueued: number;
  failed: number;
}

function validatePositiveInteger(
  value: number,
  min: number,
  max: number,
  code: string
): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(code);
  }
  return value;
}

function waitForNextTick(
  milliseconds: number,
  signal?: AbortSignal
): Promise<void> {
  if (signal?.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);

    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      resolve();
    };

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export class MediaProcessingScheduler {
  private readonly batchSize: number;
  private readonly pollIntervalMs: number;
  private readonly logger: MediaLogger;

  constructor(
    private readonly repository: MediaProcessingDiscoveryRepository,
    private readonly dispatcher: MediaProcessingDispatcher,
    options: MediaProcessingSchedulerOptions = {}
  ) {
    this.batchSize = validatePositiveInteger(
      options.batchSize ?? env.MEDIA_PROCESSING_DISCOVERY_BATCH_SIZE,
      1,
      500,
      "MEDIA_PROCESSING_DISCOVERY_BATCH_SIZE_INVALID"
    );
    this.pollIntervalMs = validatePositiveInteger(
      options.pollIntervalMs ?? env.MEDIA_PROCESSING_POLL_INTERVAL_MS,
      100,
      60_000,
      "MEDIA_PROCESSING_POLL_INTERVAL_INVALID"
    );
    this.logger = options.logger ?? new JsonMediaLogger();
  }

  async tick(): Promise<MediaProcessingSchedulerTickResult> {
    const assetIds = await this.repository.findProcessableAssetIds(
      this.batchSize
    );

    let enqueued = 0;
    let failed = 0;

    for (const assetId of assetIds) {
      try {
        await this.dispatcher.enqueue(assetId);
        enqueued += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn("media_processing_enqueue_failed", {
          assetId,
          error: sanitizeAndBoundError(error, 1000),
        });
      }
    }

    if (assetIds.length > 0) {
      this.logger.info("media_processing_discovery_tick", {
        discovered: assetIds.length,
        enqueued,
        failed,
      });
    }

    return {
      discovered: assetIds.length,
      enqueued,
      failed,
    };
  }

  async run(signal?: AbortSignal): Promise<void> {
    while (!signal?.aborted) {
      try {
        await this.tick();
      } catch (error) {
        this.logger.error("media_processing_discovery_failed", {
          error: sanitizeAndBoundError(error, 1000),
        });
      }

      if (signal?.aborted) break;
      await waitForNextTick(this.pollIntervalMs, signal);
    }
  }
}
