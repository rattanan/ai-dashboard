import { createDecipheriv, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";
import type { WorkerEnvironment } from "../../schemas/worker-env.js";
import { chunkParsedDocument, parseDocument } from "./document-parser.js";
import {
  assertEmbeddingCount,
  embeddingAdapter,
  inferEmbeddingProviderType,
} from "../ai/embedding-adapter.js";
import { fetchAiWithRetry } from "../ai/fetch-with-retry.js";
import { providerHttpError } from "../ai/provider-http-error.js";

type IndexJobRow = {
  jobId: string;
  jobStatus: string;
  documentVersionId: string;
  storageKey: string;
  mimeType: string;
  documentId: string;
  documentName: string;
  organizationId: string;
  sourceMetadata: Record<string, unknown> | null;
  embeddingModel: string;
  providerBaseUrl: string | null;
  endpointProviderType: string | null;
  endpointTimeoutMs: number | null;
  endpointBatchSize: number | null;
  endpointMaxRetries: number | null;
  ciphertext: string | null;
  iv: string | null;
  authTag: string | null;
  keyVersion: string | null;
};

function decryptProviderKey(row: IndexJobRow, environment: WorkerEnvironment) {
  if (!row.ciphertext || !row.iv || !row.authTag || !row.keyVersion)
    return undefined;
  let key: Buffer | undefined;
  if (row.keyVersion === environment.CREDENTIAL_KEY_VERSION)
    key = Buffer.from(environment.CREDENTIAL_ENCRYPTION_KEY, "base64");
  else
    for (const entry of environment.CREDENTIAL_ENCRYPTION_PREVIOUS_KEYS.split(
      ",",
    )) {
      const separator = entry.indexOf(":");
      if (separator < 1 || entry.slice(0, separator).trim() !== row.keyVersion)
        continue;
      const candidate = Buffer.from(
        entry.slice(separator + 1).trim(),
        "base64",
      );
      if (candidate.length === 32) key = candidate;
    }
  if (!key) throw new Error("Provider credential key version is unavailable");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(row.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(row.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function vectorLiteral(values: number[]) {
  if (!values.length || values.some((value) => !Number.isFinite(value)))
    throw new Error("Embedding provider returned an invalid vector");
  return `[${values.join(",")}]`;
}

async function embedBatch(
  texts: string[],
  configuration: {
    url: string;
    model: string;
    apiKey?: string;
    timeoutMs: number;
    maxRetries: number;
  },
) {
  const providerType = inferEmbeddingProviderType(undefined, configuration.url);
  const adapter = embeddingAdapter(providerType);
  const response = await fetchAiWithRetry(
    configuration.url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(configuration.apiKey
          ? { authorization: `Bearer ${configuration.apiKey}` }
          : {}),
      },
      body: JSON.stringify(adapter.request(configuration.model, texts)),
    },
    {
      timeoutMs: configuration.timeoutMs,
      maxRetries: configuration.maxRetries,
    },
  );
  if (!response.ok) throw new Error(await providerHttpError(response));
  return assertEmbeddingCount(
    adapter.vectors(await response.json()),
    texts.length,
  );
}

export async function processDocumentIndexJob(
  indexJobId: string,
  pool: Pool,
  environment: WorkerEnvironment,
) {
  const { rows } = await pool.query<IndexJobRow>(
    `SELECT
       j.id AS "jobId", j.status AS "jobStatus",
       v.id AS "documentVersionId", v."storageKey", v."mimeType",
       d.id AS "documentId", d.name AS "documentName", d."organizationId",
       d."sourceMetadata",
       j."embeddingModel", COALESCE(ep."baseUrl", p."baseUrl") AS "providerBaseUrl",
       ep."providerType"::text AS "endpointProviderType",
       ep."timeoutMs" AS "endpointTimeoutMs",
       ep."batchSize" AS "endpointBatchSize",
       ep."maxRetries" AS "endpointMaxRetries",
       COALESCE(ec.ciphertext, pc.ciphertext) AS ciphertext,
       COALESCE(ec.iv, pc.iv) AS iv,
       COALESCE(ec."authTag", pc."authTag") AS "authTag",
       COALESCE(ec."keyVersion", pc."keyVersion") AS "keyVersion"
     FROM "DocumentIndexJob" j
     JOIN "DocumentVersion" v ON v.id = j."documentVersionId"
     JOIN "Document" d ON d.id = v."documentId"
     LEFT JOIN "AiEndpointConfig" ep
       ON ep."organizationId" = d."organizationId"
      AND ep.kind = 'EMBEDDING'
      AND ep.active = true
      AND ep.model = j."embeddingModel"
     LEFT JOIN "AiEndpointCredential" ec ON ec."endpointId" = ep.id
     LEFT JOIN "LlmProvider" p
       ON p."organizationId" = d."organizationId"
      AND p.active = true
      AND p."embeddingModel" = j."embeddingModel"
      AND ep.id IS NULL
     LEFT JOIN "LlmProviderCredential" pc ON pc."providerId" = p.id
     WHERE j.id = $1
     ORDER BY ep."updatedAt" DESC NULLS LAST, p."updatedAt" DESC NULLS LAST
     LIMIT 1`,
    [indexJobId],
  );
  const job = rows[0];
  if (!job) throw new Error("Document index job was not found");
  if (job.jobStatus === "COMPLETED")
    return { indexJobId, chunkCount: 0, skipped: true as const };
  if (["CANCEL_REQUESTED", "CANCELLED"].includes(job.jobStatus)) {
    await pool.query(
      `UPDATE "DocumentIndexJob"
          SET status = 'CANCELLED', "failureCategory" = 'CANCELLED',
              "cancelledAt" = CURRENT_TIMESTAMP, "completedAt" = CURRENT_TIMESTAMP,
              "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1`,
      [indexJobId],
    );
    await pool.query(
      `UPDATE "DocumentVersion" SET status = 'CANCELLED',
              "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1`,
      [job.documentVersionId],
    );
    return { indexJobId, chunkCount: 0, skipped: true as const };
  }
  const claimed = await pool.query(
    `UPDATE "DocumentIndexJob"
       SET status = 'PROCESSING', attempt = attempt + 1,
           "startedAt" = CURRENT_TIMESTAMP, "errorMessage" = NULL,
           "failureCategory" = NULL, "progressPercent" = 1,
           "processedChunks" = 0, "lastHeartbeatAt" = CURRENT_TIMESTAMP,
           "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $1 AND status IN ('QUEUED', 'FAILED')
     RETURNING id`,
    [indexJobId],
  );
  if (!claimed.rowCount)
    return { indexJobId, chunkCount: 0, skipped: true as const };
  await pool.query(
    `UPDATE "DocumentVersion"
       SET status = 'PROCESSING', "errorMessage" = NULL,
           "updatedAt" = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [job.documentVersionId],
  );
  try {
    if (!/^[a-f0-9-]+$/.test(job.storageKey))
      throw new Error("Invalid object storage key");
    const bytes = await readFile(
      path.join(path.resolve(environment.LOCAL_STORAGE_PATH), job.storageKey),
    );
    const parsed = await parseDocument(bytes, job.documentName);
    const chunks = chunkParsedDocument(parsed, {
      maxCharacters: environment.KNOWLEDGE_CHUNK_CHARACTERS,
      overlapCharacters: environment.KNOWLEDGE_CHUNK_OVERLAP,
    });
    if (!chunks.length)
      throw new Error("Document produced no indexable chunks");
    await pool.query(
      `UPDATE "DocumentIndexJob" SET "totalChunks" = $2,
              "progressPercent" = 10, "lastHeartbeatAt" = CURRENT_TIMESTAMP,
              "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1`,
      [indexJobId, chunks.length],
    );
    const endpointBase = job.providerBaseUrl?.replace(/\/$/, "");
    const endpoint = endpointBase
      ? job.endpointProviderType === "OLLAMA"
        ? /\/api\/embed$/.test(endpointBase)
          ? endpointBase
          : `${endpointBase}/api/embed`
        : /\/embeddings$/.test(endpointBase)
          ? endpointBase
          : `${endpointBase}/embeddings`
      : environment.EMBEDDING_BASE_URL;
    const batchSize = job.endpointBatchSize ?? environment.EMBEDDING_BATCH_SIZE;
    const apiKey = decryptProviderKey(job, environment);
    const embeddings: number[][] = [];
    for (let offset = 0; offset < chunks.length; offset += batchSize) {
      const cancellation = await pool.query<{ status: string }>(
        `SELECT status FROM "DocumentIndexJob" WHERE id = $1`,
        [indexJobId],
      );
      if (cancellation.rows[0]?.status === "CANCEL_REQUESTED") {
        await pool.query(
          `UPDATE "DocumentIndexJob" SET status = 'CANCELLED',
                  "failureCategory" = 'CANCELLED', "cancelledAt" = CURRENT_TIMESTAMP,
                  "completedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [indexJobId],
        );
        await pool.query(
          `UPDATE "DocumentVersion" SET status = 'CANCELLED',
                  "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1`,
          [job.documentVersionId],
        );
        return { indexJobId, chunkCount: 0, skipped: true as const };
      }
      embeddings.push(
        ...(await embedBatch(
          chunks
            .slice(offset, offset + batchSize)
            .map((chunk) => chunk.content),
          {
            url: endpoint,
            model: job.embeddingModel,
            apiKey,
            timeoutMs:
              job.endpointTimeoutMs ?? environment.EMBEDDING_TIMEOUT_MS,
            maxRetries: job.endpointMaxRetries ?? environment.AI_MAX_RETRIES,
          },
        )),
      );
      const processed = Math.min(chunks.length, offset + batchSize);
      await pool.query(
        `UPDATE "DocumentIndexJob" SET "processedChunks" = $2,
                "progressPercent" = $3, "lastHeartbeatAt" = CURRENT_TIMESTAMP,
                "updatedAt" = CURRENT_TIMESTAMP WHERE id = $1`,
        [
          indexJobId,
          processed,
          10 + Math.round((processed / chunks.length) * 80),
        ],
      );
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM "DocumentChunk" WHERE "documentVersionId" = $1`,
        [job.documentVersionId],
      );
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        const embedding = embeddings[index];
        await client.query(
          `INSERT INTO "DocumentChunk"
             (id, "documentVersionId", ordinal, content, "contentHash",
              "tokenCount", metadata, embedding, "embeddingModel",
              "embeddingDimension", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::vector, $9, $10,
                   CURRENT_TIMESTAMP)`,
          [
            randomUUID(),
            job.documentVersionId,
            chunk.ordinal,
            chunk.content,
            chunk.contentHash,
            chunk.tokenCount,
            JSON.stringify({
              ...(job.sourceMetadata ?? {}),
              ...chunk.metadata,
            }),
            vectorLiteral(embedding),
            job.embeddingModel,
            embedding.length,
          ],
        );
      }
      await client.query(
        `UPDATE "DocumentVersion"
           SET status = 'INDEXED', "errorMessage" = NULL,
               "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [job.documentVersionId],
      );
      await client.query(
        `UPDATE "Document"
           SET "currentVersionId" = $1, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [job.documentVersionId, job.documentId],
      );
      await client.query(
        `UPDATE "DocumentIndexJob"
           SET status = 'COMPLETED', "completedAt" = CURRENT_TIMESTAMP,
               "errorMessage" = NULL, "failureCategory" = NULL,
               "progressPercent" = 100, "processedChunks" = $2,
               "lastHeartbeatAt" = CURRENT_TIMESTAMP,
               "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [indexJobId, chunks.length],
      );
      await client.query(
        `UPDATE "KnowledgeSource" s
           SET status = 'READY', "lastRefreshMessage" = NULL,
               "updatedAt" = CURRENT_TIMESTAMP
          FROM "Document" d
         WHERE d.id = $1 AND s.id = d."sourceId"
           AND NOT EXISTS (
             SELECT 1
               FROM "Document" pending_document
               JOIN "DocumentVersion" pending_version
                 ON pending_version.id = pending_document."currentVersionId"
              WHERE pending_document."sourceId" = s.id
                AND pending_document.active = true
                AND pending_version.status <> 'INDEXED'
           )`,
        [job.documentId],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { indexJobId, chunkCount: chunks.length };
  } catch (error) {
    const message = (
      error instanceof Error ? error.message : "Document indexing failed"
    ).slice(0, 500);
    const attempt = await pool.query<{ attempt: number; maxAttempts: number }>(
      `SELECT attempt, "maxAttempts" FROM "DocumentIndexJob" WHERE id = $1`,
      [indexJobId],
    );
    const deadLetter =
      (attempt.rows[0]?.attempt ?? 1) >= (attempt.rows[0]?.maxAttempts ?? 3);
    const lower = message.toLowerCase();
    const category = /parse|extract|unsupported|indexable chunks/.test(lower)
      ? "PARSER"
      : /embed|provider|vector/.test(lower)
        ? "EMBEDDING"
        : /storage|object|file|enoent/.test(lower)
          ? "STORAGE"
          : "UNKNOWN";
    await pool.query(
      `UPDATE "DocumentIndexJob"
         SET status = $3, "failureCategory" = $4, "errorMessage" = $2,
             "completedAt" = CURRENT_TIMESTAMP,
             "deadLetteredAt" = CASE WHEN $3 = 'DEAD_LETTER' THEN CURRENT_TIMESTAMP ELSE NULL END,
             "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [indexJobId, message, deadLetter ? "DEAD_LETTER" : "FAILED", category],
    );
    await pool.query(
      `UPDATE "DocumentVersion"
         SET status = 'FAILED', "errorMessage" = $2,
             "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [job.documentVersionId, message],
    );
    await pool.query(
      `UPDATE "KnowledgeSource" s
          SET status = 'FAILED', "lastRefreshMessage" = $2,
              "updatedAt" = CURRENT_TIMESTAMP
         FROM "Document" d
        WHERE d.id = $1 AND s.id = d."sourceId"`,
      [job.documentId, message],
    );
    throw new Error(message);
  }
}
