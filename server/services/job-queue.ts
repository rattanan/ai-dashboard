import { Queue } from "bullmq";
import { env } from "@/schemas/env";
import {
  createRedisConnection,
  BUSINESS_INSIGHT_JOB,
  DOCUMENT_INDEX_JOB,
  SOURCE_REFRESH_JOB,
  SYSTEM_QUEUE,
  type DocumentIndexJobData,
  type InsightKmJobResult,
} from "@/packages/queue/system-queue";

export async function enqueueDocumentIndexJob(indexJobId: string) {
  const configuration = env();
  const connection = createRedisConnection(configuration.REDIS_URL);
  const queue = new Queue<DocumentIndexJobData, InsightKmJobResult>(
    SYSTEM_QUEUE,
    {
      connection,
      prefix: process.env.BULLMQ_PREFIX ?? "insightkm",
    },
  );
  try {
    await assertQueueCapacity(queue, configuration.QUEUE_MAX_WAITING_JOBS);
    await queue.add(
      DOCUMENT_INDEX_JOB,
      { indexJobId },
      {
        jobId: `document-index-${indexJobId}-${Date.now()}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { age: 86_400, count: 1_000 },
        removeOnFail: { age: 604_800, count: 2_000 },
      },
    );
  } finally {
    await queue.close();
    connection.disconnect();
  }
}

export async function enqueueSourceRefreshJob(input: {
  sourceId: string;
  refreshRunId?: string;
  trigger: "MANUAL" | "SCHEDULED";
}) {
  const configuration = env();
  const connection = createRedisConnection(configuration.REDIS_URL);
  const queue = new Queue(SYSTEM_QUEUE, {
    connection,
    prefix: process.env.BULLMQ_PREFIX ?? "insightkm",
  });
  try {
    await assertQueueCapacity(queue, configuration.QUEUE_MAX_WAITING_JOBS);
    const job = await queue.add(SOURCE_REFRESH_JOB, input, {
      jobId: `source-refresh-${input.refreshRunId ?? `${input.sourceId}-${Date.now()}`}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 604_800, count: 2_000 },
    });
    return String(job.id);
  } finally {
    await queue.close();
    connection.disconnect();
  }
}

export async function enqueueBusinessInsightJob(businessInsightJobId: string) {
  const configuration = env();
  const connection = createRedisConnection(configuration.REDIS_URL);
  const queue = new Queue(SYSTEM_QUEUE, {
    connection,
    prefix: process.env.BULLMQ_PREFIX ?? "insightkm",
  });
  try {
    await assertQueueCapacity(queue, configuration.QUEUE_MAX_WAITING_JOBS);
    await queue.add(
      BUSINESS_INSIGHT_JOB,
      { businessInsightJobId },
      {
        jobId: `business-insight-${businessInsightJobId}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { age: 86_400, count: 1_000 },
        removeOnFail: { age: 604_800, count: 2_000 },
      },
    );
  } finally {
    await queue.close();
    connection.disconnect();
  }
}

export function queueHasCapacity(
  counts: { waiting?: number; delayed?: number; active?: number },
  maximumDepth: number,
) {
  return (
    (counts.waiting ?? 0) + (counts.delayed ?? 0) + (counts.active ?? 0) <
    maximumDepth
  );
}

async function assertQueueCapacity(queue: Queue, maximumDepth: number) {
  const counts = await queue.getJobCounts("waiting", "delayed", "active");
  if (!queueHasCapacity(counts, maximumDepth))
    throw new Error("QUEUE_BACKPRESSURE");
}

export async function configureSourceRefreshSchedule(input: {
  sourceId: string;
  enabled: boolean;
  intervalMinutes: number;
}) {
  const configuration = env();
  const connection = createRedisConnection(configuration.REDIS_URL);
  const queue = new Queue(SYSTEM_QUEUE, {
    connection,
    prefix: process.env.BULLMQ_PREFIX ?? "insightkm",
  });
  const schedulerId = `source-refresh-schedule-${input.sourceId}`;
  try {
    if (!input.enabled) {
      await queue.removeJobScheduler(schedulerId);
      return;
    }
    await queue.upsertJobScheduler(
      schedulerId,
      { every: input.intervalMinutes * 60_000 },
      {
        name: SOURCE_REFRESH_JOB,
        data: {
          sourceId: input.sourceId,
          trigger: "SCHEDULED" as const,
        },
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 5_000 },
          removeOnComplete: { age: 86_400, count: 1_000 },
          removeOnFail: { age: 604_800, count: 2_000 },
        },
      },
    );
  } finally {
    await queue.close();
    connection.disconnect();
  }
}

export async function getSystemQueueMetrics() {
  const configuration = env();
  const connection = createRedisConnection(configuration.REDIS_URL);
  const queue = new Queue(SYSTEM_QUEUE, {
    connection,
    prefix: process.env.BULLMQ_PREFIX ?? "insightkm",
  });
  try {
    return await queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "completed",
      "failed",
    );
  } finally {
    await queue.close();
    connection.disconnect();
  }
}
