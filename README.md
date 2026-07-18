# AI Dashboard

AI Dashboard is a multi-tenant platform foundation for connecting governed business data, discovering its structure, and preparing professional dashboards for later AI-assisted analysis. Phase 0 deliberately saves the setup context and an analysis placeholder without fabricating AI output or implementing a chart engine.

## Phase 0 capabilities

- Email/password registration and Auth.js credentials sessions
- Organizations, memberships, roles, and workspaces
- Eight-step persistent data-source and dashboard setup wizard
- AES-256-GCM encrypted database credentials
- Real MySQL connection testing and `information_schema` metadata discovery
- AST-validated read-only MySQL queries and limited samples at the connector boundary
- Excel `.xlsx`/`.xls` parsing through a storage abstraction
- PostgreSQL, SQL Server, and Oracle adapter placeholders that return explicit not-implemented errors
- Dashboard drafts, immutable versions, widget-ready JSON models, and analysis placeholders
- Tenant-scoped repositories, authorization helpers, sanitized logging, and audit records
- Docker/Cloud Run-compatible build, migration, seed, and test tooling

## Technology

Next.js 16.2 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn-style local UI primitives, Lucide, Auth.js, Prisma ORM 7, PostgreSQL, MySQL2, SheetJS, Zod, React Hook Form, Vitest, and Playwright.

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

Open `http://localhost:3000`. Seed credentials are development-only:

- Email: `demo@ai-dashboard.local`
- Password: `DemoPassword123!`

Generate secrets rather than using the placeholders:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Use the base64 value for `CREDENTIAL_ENCRYPTION_KEY` and a 32+ character value for `AUTH_SECRET`.

## Environment variables

| Variable                    | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`              | PostgreSQL URL for the AI Dashboard application database  |
| `AUTH_SECRET`               | Auth.js signing/encryption secret, at least 32 characters |
| `CREDENTIAL_ENCRYPTION_KEY` | Exactly 32 random bytes encoded as base64                 |
| `CREDENTIAL_KEY_VERSION`    | Stored encryption-key version; defaults to `env-v1`       |
| `APP_URL`                   | Public application origin                                 |
| `OBJECT_STORAGE_DRIVER`     | `local` in Phase 0; `gcs` is a documented future adapter  |
| `LOCAL_STORAGE_PATH`        | Local workbook storage root                               |
| `MAX_EXCEL_UPLOAD_BYTES`    | Workbook upload limit; defaults to 10 MiB                 |
| `LOG_LEVEL`                 | Structured server log level                               |

Environment configuration is validated with Zod on the server. Never prefix secrets with `NEXT_PUBLIC_`.

## Database migrations and seed

The initial SQL migration is committed in `prisma/migrations`. Prisma 7 does not automatically generate the client or run seeds during migration, so use explicit commands:

```bash
npm run db:generate
npm run db:migrate   # development migration creation/application
npm run db:deploy    # apply committed migrations in deployment
npm run db:seed      # explicit development seed
```

The seed creates one owner, organization, workspace, a credential-free PostgreSQL `DRAFT` source, and a sample dashboard/version. It contains no usable database credential.

## Architecture

- `app`: route groups, Server Action/Route Handler entry points, loading/error boundaries
- `components`: accessible UI primitives, workspace shell, authentication, and wizard UI
- `features`: business mutations for authentication, onboarding, data sources, and dashboards
- `schemas` / `types`: Zod contracts and stable result/error types
- `server/auth`: session-derived tenant authorization and role hierarchy
- `server/repositories`: workspace-scoped database reads
- `server/services`: encryption, logging, Excel upload, metadata persistence, audit behavior
- `server/connectors`: common connector contract, MySQL adapter, SQL guard, and honest placeholders
- `server/storage`: object storage interface and local development adapter
- `prisma`: schema, migration, and idempotent development seed

Pages and handlers do not own database or connector logic. Every mutation validates untrusted input and repeats authorization instead of relying on page visibility or `proxy.ts`.

## Connector security

- Plaintext database passwords are encrypted immediately with AES-256-GCM and never returned after saving.
- Logs recursively redact passwords, secrets, tokens, authorization headers, ciphertext, and connection strings.
- MySQL connections run server-side with short timeouts and `multipleStatements: false`.
- User queries must parse as one `SELECT`/read-only CTE and cannot use DML, DDL, calls, locking, or file-output clauses.
- Metadata discovery uses fixed `information_schema` queries.
- Sample identifiers must originate from discovered metadata and the row limit is bounded.
- A read-only database account is still required. Application SQL guards are defense in depth, not a substitute for database grants.
- Every data-source and dashboard record is resolved through the current workspace and membership.
- Connection operations emit audit events without storing secrets or raw database errors.
- Failed connection tests return an expandable sanitized diagnostic block containing the application code, request ID, driver code, SQL state, errno, and operation when available. Passwords, connection strings, raw driver messages, and stack traces remain server-only/redacted.

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

## Current limitations

- Only MySQL has live database testing and metadata discovery.
- Excel files are locally persisted only; production GCS support is not implemented.
- No real AI provider, AI Copilot, dashboard chart engine, or dashboard editor exists yet.
- Google login, email verification, password reset, invitations, join codes, and advanced role editing are deferred.
- Dashboard status `ANALYZING` is an explicit placeholder.
- Workspace selection currently uses the first accessible workspace; persistence of an actively selected workspace is a later enhancement.

## Next phases

1. Google Cloud KMS and GCS production adapters.
2. PostgreSQL connector, followed by SQL Server and Oracle.
3. Metadata sampling, semantic modeling, and AI provider interfaces.
4. Dashboard layout/widget renderer and accessible charts.
5. AI Copilot changes, version comparison, and publishing workflows.
6. Invitations, workspace switching, Google authentication, and granular permissions.
