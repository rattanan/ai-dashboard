# AI Dashboard

AI Dashboard is a multi-tenant platform for connecting governed business data, discovering its structure, and generating reviewable dashboards from grounded AI analysis. Phase 1 produces only metadata-validated artifacts and successfully executed read-only query results; it does not fabricate fields, values, or insights.

## Enterprise security and Excel capabilities

- Administrator-only account provisioning; public registration is disabled in both UI and server actions
- Flexible organization roles and permissions plus per-data-source, per-dashboard, export, and AI policies
- Pending, active, locked, disabled, and soft-deleted accounts with forced temporary-password replacement
- Persistent brute-force/rate-limit protection, login history, single-use password reset, and session invalidation
- Immutable-through-application audit views, recursive sensitive-value masking, filters, details, and governed CSV exports
- First-class `.xlsx` import with sheet tables, inferred columns, paged rows, version history, schema diffs, warnings, and rollback

## Phase 1 capabilities

- OpenAI-compatible provider abstraction for official OpenAI, OpenRouter, and local compatible servers
- Zod-validated structured output, health checks, timeouts, retries, request IDs, token accounting, and workspace-scoped response caching
- Persistent restartable analysis stages and an explicit human approval boundary
- Deterministic metadata ranking, context limits, sensitive-value masking, and visible scope reductions
- Grounded business entities, KPI recommendations, dashboard plans, widgets, SQL, previews, and insights
- AST-based table, column, relationship, function, statement, row-limit, and timeout enforcement
- KPI/widget approval, rejection, label editing, SQL retesting, individual regeneration, and audit history
- Immutable dashboard versions and responsive Recharts rendering without fake fallback data

## Phase 0 capabilities

- Auth.js credentials sessions and Argon2id password authentication
- Organizations, memberships, roles, and workspaces
- Eight-step persistent data-source and dashboard setup wizard
- AES-256-GCM encrypted database credentials
- Real MySQL connection testing and `information_schema` metadata discovery
- AST-validated read-only MySQL queries and limited samples at the connector boundary
- Excel `.xlsx` parsing through a storage abstraction
- PostgreSQL, SQL Server, and Oracle adapter placeholders that return explicit not-implemented errors
- Dashboard drafts, immutable versions, widget-ready JSON models, and analysis placeholders
- Tenant-scoped repositories, authorization helpers, sanitized logging, and audit records
- Docker/Cloud Run-compatible build, migration, seed, and test tooling

## Technology

Next.js 16.2 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn-style local UI primitives, Lucide, Recharts, Auth.js, Prisma ORM 7, PostgreSQL, MySQL2, SheetJS, Zod, React Hook Form, Vitest, and Playwright.

## Local setup

Requirements: Node.js 22+, npm, and Docker for local databases and connector integration tests.

```bash
npm install
cp .env.example .env
docker compose up -d postgres mysql-fixture
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. Before seeding, configure the initial administrator environment variables. No administrator password is hardcoded in the repository.

Generate secrets rather than using the placeholders:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Use the base64 value for `CREDENTIAL_ENCRYPTION_KEY` (or the dedicated `DATA_SOURCE_ENCRYPTION_KEY`) and a 32+ character value for `AUTH_SECRET`.

## Environment variables

| Variable                              | Purpose                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                        | PostgreSQL URL for the AI Dashboard application database                      |
| `AUTH_SECRET`                         | Auth.js signing/encryption secret, at least 32 characters                     |
| `CREDENTIAL_ENCRYPTION_KEY`           | Exactly 32 random bytes encoded as base64                                     |
| `CREDENTIAL_KEY_VERSION`              | Stored encryption-key version; defaults to `env-v1`                           |
| `APP_URL`                             | Public application origin                                                     |
| `OBJECT_STORAGE_DRIVER`               | `local` in Phase 0; `gcs` is a documented future adapter                      |
| `LOCAL_STORAGE_PATH`                  | Local workbook storage root                                                   |
| `MAX_EXCEL_UPLOAD_BYTES`              | Workbook upload limit; defaults to 10 MiB                                     |
| `LOG_LEVEL`                           | Structured server log level                                                   |
| `AI_PROVIDER`                         | `openai-compatible` provider factory selection                                |
| `AI_BASE_URL`                         | Provider `/v1` base URL for OpenAI/OpenRouter/local                           |
| `AI_API_KEY`                          | Optional provider bearer token                                                |
| `AI_MODEL`                            | Provider model identifier; required to start analysis                         |
| `AI_SUPPORTS_JSON_SCHEMA`             | Strict JSON Schema mode, otherwise JSON object mode                           |
| `AI_TIMEOUT_MS`                       | Absolute per-provider-request timeout; use `300000` for large streamed models |
| `AI_STREAM_INACTIVITY_TIMEOUT_MS`     | Maximum silence between streamed provider chunks                              |
| `AI_MAX_RETRIES`                      | Transient provider retry count                                                |
| `AI_TEMPERATURE`                      | Structured generation temperature                                             |
| `AI_MAX_TABLES`                       | Maximum tables included in provider context                                   |
| `AI_MAX_COLUMNS_PER_TABLE`            | Maximum columns per included table                                            |
| `AI_SAMPLE_ROWS_PER_TABLE`            | Maximum sample rows per included table                                        |
| `AI_MAX_SAMPLE_CELL_LENGTH`           | Maximum transmitted sample-cell characters                                    |
| `AI_MAX_CONTEXT_CHARACTERS`           | Hard serialized metadata context limit                                        |
| `AI_SEND_SAMPLE_DATA`                 | Permit samples/query previews for grounded generation                         |
| `AI_MASK_SENSITIVE_DATA`              | Mask likely sensitive values before transmission                              |
| `AI_MAX_KPI_RECOMMENDATIONS`          | Maximum KPI recommendations                                                   |
| `AI_MAX_WIDGETS`                      | Maximum generated widgets                                                     |
| `AI_MAX_INSIGHTS`                     | Maximum grounded insights                                                     |
| `QUERY_TIMEOUT_MS`                    | Generated-query execution timeout                                             |
| `QUERY_MAX_ROWS`                      | Hard generated-query row limit                                                |
| `QUERY_PREVIEW_ROWS`                  | Maximum review/rendering preview rows                                         |
| `INITIAL_ADMIN_NAME`                  | Initial environment-seeded administrator name                                 |
| `INITIAL_ADMIN_EMAIL`                 | Initial administrator email                                                   |
| `INITIAL_ADMIN_USERNAME`              | Optional initial administrator username                                       |
| `INITIAL_ADMIN_PASSWORD`              | Strong temporary administrator password; never commit it                      |
| `MAX_FAILED_LOGIN_ATTEMPTS`           | Failures before account lock; defaults to 5                                   |
| `ACCOUNT_LOCK_DURATION_MINUTES`       | Automatic lock duration; defaults to 30 minutes                               |
| `LOGIN_RATE_LIMIT_WINDOW_MINUTES`     | Persistent login/recovery rate-limit window                                   |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS`       | Maximum requests per rate-limit bucket                                        |
| `PASSWORD_RESET_TOKEN_EXPIRY_MINUTES` | Single-use reset expiry; defaults to 30 minutes                               |
| `PASSWORD_RESET_DELIVERY_URL`         | Trusted HTTPS notification-service webhook                                    |
| `PASSWORD_RESET_DELIVERY_TOKEN`       | Server-only notification webhook bearer token                                 |
| `MAX_EXCEL_IMPORT_ROWS`               | Maximum imported workbook data rows                                           |
| `MAX_EXCEL_SHEETS`                    | Maximum workbook sheets                                                       |
| `SEED_DEVELOPMENT_TEST_USERS`         | Opt-in non-production role test accounts                                      |
| `DEVELOPMENT_TEST_USER_PASSWORD`      | Shared local-only password for opt-in test accounts                           |

Environment configuration is validated with Zod on the server. Never prefix secrets with `NEXT_PUBLIC_`.

Some OpenAI-compatible providers reject large strict JSON Schemas. If analysis fails with a provider schema-limit error, set `AI_SUPPORTS_JSON_SCHEMA="false"`; the application will request JSON-object mode and still validate the completed response with Zod.

## Database migrations and seed

The initial SQL migration is committed in `prisma/migrations`. Prisma 7 does not automatically generate the client or run seeds during migration, so use explicit commands:

```bash
npm run db:generate
npm run db:migrate   # development migration creation/application
npm run db:deploy    # apply committed migrations in deployment
npm run db:seed      # explicit development seed
```

The seed creates the environment-provided System Admin, organization, workspace, default roles/permissions, a credential-free PostgreSQL `DRAFT` source, and two sample dashboards. `Visual Analytics Showcase` is a generated, presentation-ready demonstration containing KPI comparison, trend, category, target, funnel, waterfall, timeline, exception table, filters, and insight widgets backed by deterministic sample rows. It contains no usable database credential.

## Architecture

- `app`: route groups, Server Action/Route Handler entry points, loading/error boundaries
- `components`: accessible UI primitives, workspace shell, authentication, and wizard UI
- `features`: business mutations for authentication, onboarding, data sources, and dashboards
- `schemas` / `types`: Zod contracts and stable result/error types
- `server/auth`: session-derived tenant authorization and role hierarchy
- `server/ai`: provider contracts, compatible adapter, caching, prompts, and grounding
- `server/repositories`: workspace-scoped database reads
- `server/services`: encryption, logging, Excel upload, metadata persistence, audit behavior
- `server/connectors`: common connector contract, MySQL adapter, SQL guard, and honest placeholders
- `server/storage`: object storage interface and local development adapter
- `prisma`: schema, migration, and idempotent development seed

Pages and handlers do not own database or connector logic. Every mutation validates untrusted input and repeats authorization instead of relying on page visibility or `proxy.ts`.

See [Phase 1 architecture](docs/phase1-architecture.md) for the stage lifecycle, grounding boundaries, approval workflow, and worker migration path.

See [Enterprise access and Excel architecture](docs/enterprise-security.md) for the permission matrix, account lifecycle, reset delivery, Excel import/versioning, and migration guidance.

See [Rich dashboard engine](docs/rich-dashboard-engine.md) for visualization selection, widget contracts, quality scoring, filter behavior, renderer boundaries, and backward compatibility.

### Development role accounts

With `SEED_DEVELOPMENT_TEST_USERS=true`, explicit seeding creates the following local-only accounts using `DEVELOPMENT_TEST_USER_PASSWORD`:

- `datasource.manager@ai-dashboard.local`
- `dashboard.builder@ai-dashboard.local`
- `dashboard.viewer@ai-dashboard.local`

The System Admin address and password always come from `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.

## Analysis execution model

Phase 1 does not claim to run an unavailable background worker. Starting analysis creates a durable `AnalysisJob`. While the analysis page is open, the browser requests one bounded stage at a time. Each stage obtains an optimistic claim, persists artifacts and progress, and releases the claim before the next request. Closing the page preserves completed work; reopening it resumes from the persisted stage. A failed stage can be explicitly retried. The same stage handler can later be driven by Cloud Tasks, Pub/Sub, or a worker.

Generation stops at `WAITING_FOR_APPROVAL`. Finalization requires approved KPI and widget recommendations plus successful query previews, excludes rejected items, and creates an immutable `DashboardVersion`.

## Connector security

- Plaintext database passwords are encrypted immediately with AES-256-GCM and never returned after saving.
- Logs recursively redact passwords, secrets, tokens, authorization headers, ciphertext, and connection strings.
- MySQL connections run server-side with short timeouts and `multipleStatements: false`.
- User queries must parse as one `SELECT`/read-only CTE and cannot use DML, DDL, calls, locking, or file-output clauses.
- Generated queries must also resolve every table and column against the bounded approved context, use discovered relationship columns, avoid unsafe functions, and receive a fixed row cap.
- Metadata discovery uses fixed `information_schema` queries.
- Sample identifiers must originate from discovered metadata and the row limit is bounded.
- A read-only database account is still required. Application SQL guards are defense in depth, not a substitute for database grants.
- Every data-source and dashboard record is resolved through the current workspace and membership.
- Connection operations emit audit events without storing secrets or raw database errors.
- Failed connection tests return an expandable sanitized diagnostic block containing the application code, request ID, driver code, SQL state, errno, and operation when available. Passwords, connection strings, raw driver messages, and stack traces remain server-only/redacted.
- Provider prompts, API keys, database credentials, and raw query results are never logged. AI cache entries are isolated by workspace, provider, model, prompt version, and request hash.
- Workspace settings disclose sample/query-preview transmission and masking behavior.

### MariaDB compatibility

The MySQL connector uses the MySQL wire protocol and is compatible with MariaDB in general. MariaDB 5.5 is supported on a legacy, best-effort basis for connection testing and `information_schema` metadata discovery. A successful connection displays the exact server version and an end-of-life warning.

MariaDB 5.5 reached end of maintenance in April 2020. Upgrade to a maintained MariaDB LTS release is strongly recommended. AI Dashboard will not lower Node.js TLS security settings to negotiate obsolete TLS versions; an old server that only offers legacy TLS must be upgraded or placed behind a properly secured modern proxy. Disabling TLS is appropriate only on a separately secured private network after an explicit risk review.

For production, rotate the environment key through the `CredentialEncryptionService` key-version seam or replace it with Google Cloud KMS. Restrict Cloud Run egress according to the databases the deployment is allowed to reach.

## Excel storage and Cloud Run

The `ObjectStorageService` boundary currently ships with a local filesystem adapter for development. Cloud Run filesystems are ephemeral, so production must implement/configure the planned Google Cloud Storage adapter before relying on Excel persistence. Selecting `OBJECT_STORAGE_DRIVER=gcs` currently returns an explicit not-implemented response.

## Docker and Cloud Run

Start only databases:

```bash
docker compose up -d postgres mysql-fixture
```

Build and run the full application profile:

```bash
docker compose --profile app up --build
```

The multi-stage image emits Next.js standalone output, listens on port `8080`, and runs as a non-root user. Apply migrations as a separate deployment job before routing production traffic. Supply all secrets through Secret Manager/environment configuration; do not bake real values into the image.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Unit tests cover validation, encryption/tampering, read-only SQL, roles, recursive redaction, connector selection, unsupported adapters, and Excel rejection. The MySQL integration test is enabled with:

```bash
TEST_MYSQL_HOST=127.0.0.1 TEST_MYSQL_PORT=3306 npm test
```

Playwright browser installation may be required once per machine with `npx playwright install chromium`.

Application-database integration tests are enabled with `TEST_DATABASE_URL`. Provider unit tests use mocked HTTP responses; tests never send prompts to a live AI provider.

## Current limitations

- Only MySQL has live database testing and metadata discovery.
- Excel files are locally persisted only; production GCS support is not implemented.
- AI Copilot authorization policies and audit storage are present, but the free-form Copilot conversation UI/execution workflow is not implemented yet.
- Google login, email verification, password reset, invitations, join codes, and advanced role editing are deferred.
- Analysis stages are synchronously advanced through bounded HTTP requests; no background worker is deployed yet.
- Generated date/category filters update every compatible widget over its persisted validated result preview. Server-side parameterized re-execution for ranges outside that bounded preview remains deferred.
- Recharts and purpose-built accessible HTML/SVG components render persisted previews; scheduled and live query refresh are deferred.
- Workspace selection currently uses the first accessible workspace; persistence of an actively selected workspace is a later enhancement.

## Next phases

1. Google Cloud KMS and GCS production adapters.
2. PostgreSQL connector, followed by SQL Server and Oracle.
3. Cloud Tasks/Pub/Sub workers and scheduled dashboard refresh.
4. Interactive filter-driven refresh and the full dashboard editor.
5. AI Copilot changes, version comparison, and publishing workflows.
6. Invitations, workspace switching, Google authentication, and granular permissions.
