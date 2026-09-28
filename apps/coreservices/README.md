# coreservices — Dewa Surya Hub API

Spring Boot 4.1 (Java 21) modular monolith behind Nginx. It implements the contract in
[ADR-003](../../docs/ADR/ADR-003-api-contract.md) (base path `/v1`), the schema in
[ADR-004](../../docs/ADR/ADR-004-initial_schema_model.md) (Flyway), the use cases in
[ADR-002](../../docs/ADR/ADR-002-usecase.md), the hub SSO handoff from
[ADR-001 §5.7](../../docs/ADR/ADR-001-initial_technology.md), and the Tiptap article body from
[ADR-009](../../docs/ADR/ADR-009-article_authoring_and_display.md).

## Run it

### Tests / build

```bash
cd apps/coreservices
./gradlew build          # compiles, runs all unit + integration tests (needs Docker for Testcontainers)
```

Gradle uses the Java 21 toolchain (auto-detected; set `JAVA_HOME` to a JDK 17+ to run Gradle itself).
Integration tests start one `postgres:16-alpine` container, run every Flyway migration and let
Hibernate `validate` the entities against it.

### Local, from Gradle (profile `local`)

```bash
docker compose up -d postgres                                # repo root; Postgres on localhost:5434, db/user/password "hub"
cd apps/coreservices
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun               # API on http://localhost:8080/v1
```

The `local` profile needs **no real credentials**:

| Integration          | Local behaviour                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Firebase ID tokens   | HS256 tokens signed with `hub.firebase.dev-jwt-secret`. Get one: `POST /v1/dev/token {"uid":"local-admin","email":"me@example.com","name":"Me"}` (`local-admin` is the bootstrap admin). |
| Firebase custom tokens (SSO) | `FakeFirebaseTokenMinter` returns an unsigned `fake-custom-token.*` string.                           |
| Midtrans             | `FakeMidtransGateway` (logs). Simulate a payment: `POST /v1/dev/midtrans/simulate {"orderId":"DSH-…","transactionStatus":"settlement"}` — it sets the fake Status API answer and runs the real, signed webhook. |
| Images               | Written to `./build/local-media`, served at `http://localhost:8080/local-media/...`.                          |
| Revalidation         | No-op (logged) unless `HUB_REVALIDATE_URL` is set.                                                            |
| Product credential   | `LocalDevSeeder` creates Document Doctor client `dd_local_DEVCLIENT` / `local-dev-secret-0123456789-abcdefghijklmnop` and redirect URI `http://localhost:3001/auth/callback`. |

Swagger UI (local only): `http://localhost:8080/v1/swagger-ui.html`, OpenAPI at `/v1/openapi.json`.
Click **Authorize** and paste a token from `POST /v1/dev/token` into `firebaseIdToken`; `/v1/products/**`
calls also need the seeded client id/secret in `productClientId` / `productClientSecret`.

### Local, full stack with Docker Compose

```bash
docker compose up --build        # repo root
curl http://localhost:8088/v1/public/products
```

`postgres` (host port 5434), `core-services` (not published; `local` profile by default) and
`nginx` (host port 8088, config `apps/nginx/nginx.conf` with the ADR-003 §3.7 rate limits, JSON
error pages, `/actuator` blocked). Ports 5437 and 8081 are avoided on purpose. Override with
`HUB_DB_PORT`, `HUB_HTTP_PORT`, `SPRING_PROFILES_ACTIVE`, etc.

### Docker image

```bash
docker buildx build --platform linux/arm64 -t dewa-hub/coreservices apps/coreservices
```

Multi-stage (Temurin 21 JDK → JRE, Ubuntu noble), non-root user, layered jar, `HEALTHCHECK` on
`/actuator/health/readiness`, `SPRING_PROFILES_ACTIVE=prod`, `-XX:MaxRAMPercentage=60`.
The `webp` distro package is **not** installed: scrimage-webp 4.6.8 bundles a `static-pie`
`cwebp`/`dwebp` for linux-aarch64 (verified with `file`, and by uploading an image inside the
container). It extracts them into `java.io.tmpdir` (`/app/tmp`), which must not be `noexec`.

## Configuration

`application.yaml` holds defaults; `application-local.yaml`, `application-test.yaml` and
`application-prod.yaml` override the external integrations. All external settings live under `hub.*`
(`HubProperties`). Production has no defaults for secrets.

| Env var                                 | Property                                  | Notes                                                                 |
| --------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------- |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`  | `spring.datasource.*`                     | Supabase session pooler, `sslmode=require` in prod.                   |
| `DB_POOL_SIZE`                          | `spring.datasource.hikari.maximum-pool-size` | Default 8.                                                         |
| `FIREBASE_PROJECT_ID`                   | `hub.firebase.project-id`                 | Issuer `https://securetoken.google.com/<id>`, audience `<id>`.        |
| `HUB_DEV_JWT_SECRET`                    | `hub.firebase.dev-jwt-secret`             | Local/test only. Empty = verify with Google's JWKS (RS256).           |
| `HUB_FIREBASE_TOKEN_MINTER`             | `hub.firebase.token-minter`               | `fake` or `admin-sdk` (prod).                                         |
| `FIREBASE_SERVICE_ACCOUNT_PATH`         | `hub.firebase.service-account-path`       | Service account JSON (from SSM); empty = Application Default Credentials. |
| `MIDTRANS_MODE`                         | `hub.midtrans.mode`                       | `fake` or `live` (prod).                                              |
| `MIDTRANS_SERVER_KEY`                   | `hub.midtrans.server-key`                 | Basic auth + webhook signature.                                       |
| `MIDTRANS_SANDBOX`                      | `hub.midtrans.sandbox`                    | Picks sandbox/production Snap + API base URLs.                        |
| `MIDTRANS_SNAP_BASE_URL`, `MIDTRANS_API_BASE_URL` | `hub.midtrans.snap-base-url`, `api-base-url` | Optional overrides.                                           |
| `MIDTRANS_SNAP_EXPIRY_MINUTES`          | `hub.midtrans.snap-expiry-minutes`        | Default 1440.                                                         |
| `HUB_STORAGE_TYPE`                      | `hub.storage.type`                        | `local` or `s3` (prod).                                               |
| `HUB_STORAGE_PUBLIC_BASE_URL`           | `hub.storage.public-base-url`             | CloudFront base URL (`https://cdn.<domain>`).                         |
| `HUB_S3_BUCKET`, `HUB_S3_REGION`        | `hub.storage.s3-bucket`, `s3-region`      | Credentials from the instance role (default provider chain).          |
| `HUB_STORAGE_LOCAL_DIR`                 | `hub.storage.local-dir`                   | Local storage directory.                                              |
| `HUB_REVALIDATE_URL`, `HUB_REVALIDATE_SECRET` | `hub.revalidate.url`, `secret`      | Next.js `/api/revalidate`; empty URL = no-op.                         |
| `HUB_CORS_ALLOWED_ORIGINS`              | `hub.cors.allowed-origins`                | Comma separated.                                                      |
| `HUB_BOOTSTRAP_ADMIN_UID`               | `hub.bootstrap-admin-uid`                 | This Firebase uid becomes `ADMIN` on sign-in.                         |
| `HUB_SITE_BASE_URL`                     | `hub.site-base-url`                       | Used for `canonicalUrl`.                                              |
| `HUB_SSO_ALLOW_LOCALHOST`               | `hub.sso.allow-localhost-redirects`       | Allow `http://localhost` redirect URIs (dev only).                    |
| `HUB_JOBS_ENABLED`                      | `hub.jobs.enabled`                        | `@Scheduled` + ShedLock jobs (off in tests).                          |
| `DD_CLIENT_ID`, `DD_CLIENT_SECRET_HASH` | Flyway placeholders                       | V5 seeds the first Document Doctor credential only when the Argon2id hash is set. |

## Package layout

```
com.sdewa.coreservices
├── common        envelopes (ApiResponse, PagedResponse, PageMeta, Money, Responses, PatchBody),
│                 errors (ErrorReason → HTTP + fixed message, ApiException, GlobalExceptionHandler,
│                 ErrorResponseWriter), web filters (TraceIdFilter, CacheControlFilter),
│                 paging (PageQuery: 1-based page, limit ≤ 100, sort allow-lists), util
├── config        HubProperties, WebConfig (/v1 prefix, ETag on /v1/public/*, /local-media),
│                 SchedulingConfig (ShedLock JDBC), LocalDevSeeder
├── security      SecurityConfig (one rule per endpoint group, CORS), FirebaseJwtDecoderConfig,
│                 HubJwtAuthenticationConverter (role from PostgreSQL), HubAuthentication,
│                 ProductClientFilter (X-Client-Id/Secret, check order of §8.2), DevTokenController (local)
├── identity      users, memberships: /me/session, /me, /products/{code}/members
├── product       products, plans, client credentials (Argon2id + 60 s verify cache), redirect URIs,
│                 /public/products
├── content       articles, categories, tags, slug history, public reads, sitemap;
│   ├── body          ArticleBodyValidator — the ADR-009 §4.2 allowlist (validator = sanitizer)
│   ├── revalidation  RevalidationClient (HTTP) + RevalidationService (after commit, retries)
│   └── linkpreview   LinkPreviewService (SSRF-safe fetch) + AddressPolicy
├── media         images: ImageProcessor (Scrimage, EXIF, WebP 480/960/1600, bounded pool),
│                 ImageStorage (S3ImageStorage | LocalImageStorage), MediaService
├── subscription  subscriptions, EntitlementService, expiry job, /me/subscriptions, entitlements
├── payment       transactions + history, CheckoutService (idempotency, reuse, Snap),
│                 PaymentStatusService (lock + status machine + subscription create/extend/cancel),
│   │             webhook, /me/transactions, AdminTransactionService (filters, summary, sync)
│   └── midtrans      MidtransGateway (HttpMidtransGateway | FakeMidtransGateway), signature, status
├── sso           /sso/codes, /sso/token, PKCE, FirebaseTokenMinter (Admin SDK | fake), cleanup job
└── admin         every /admin/** controller (delegating to the owning module) + AdminUserService
```

External systems are behind interfaces selected by configuration: `MidtransGateway`,
`ImageStorage`, `FirebaseTokenMinter`, `RevalidationClient`.

## Endpoints

All ADR-003 §4.1 endpoints, plus:

| Method | Path                                             | Auth          | Source                  |
| ------ | ------------------------------------------------ | ------------- | ----------------------- |
| POST   | `/v1/sso/codes`                                  | User          | ADR-001 §5.7            |
| POST   | `/v1/sso/token`                                  | client secret (server to server) | ADR-001 §5.7 |
| POST   | `/v1/admin/link-preview`                         | Admin         | ADR-009 §5.5            |
| POST   | `/v1/admin/products/{id}/redirect-uris`          | Admin         | needed to register SSO redirect URIs |
| DELETE | `/v1/admin/products/{id}/redirect-uris/{uriId}`  | Admin         | same                    |
| POST   | `/v1/dev/token`, `/v1/dev/midtrans/simulate`     | none, **`local` profile only** | local development |

### SSO contract

`POST /v1/sso/codes` (Bearer = hub user's Firebase ID token)

```json
{ "clientId": "dd_live_4F7K2M9Q", "redirectUri": "https://documentdoctor.example/auth/callback",
  "codeChallenge": "<base64url(sha256(verifier))>", "codeChallengeMethod": "S256" }
```

→ `201 { data: { code, redirectUri, expiresAt } }`. Checks the client is active, the product is
active (`403 PRODUCT_INACTIVE`), and `redirectUri` equals a registered URI exactly (`400`, field
`redirectUri`); records the membership (UC-06). The code is 32 random bytes (base64url), valid 60 s,
stored only as SHA-256.

`POST /v1/sso/token` (no user token)

```json
{ "code": "...", "codeVerifier": "...", "clientId": "...", "clientSecret": "...", "redirectUri": "optional, must match" }
```

→ `200 { data: { customToken, tokenType: "firebase_custom_token", expiresIn: 3600, user: {id, firebaseUid, email, name, avatarUrl}, entitlement } }`.
Wrong credential → `401 INVALID_CLIENT`. Unknown, expired, cancelled, reused, other client's, or
failed-PKCE code → `400 INVALID_GRANT`. Every redemption attempt burns the code; a reused code also
cancels the product's other open codes for that user.

## Deviations from the ADRs

| # | Area | ADR says | Implemented | Why |
| - | ---- | -------- | ----------- | --- |
| 1 | Base path | `/v1` (`server.servlet.context-path` or prefix) | `PathMatchConfigurer.addPathPrefix("/v1")` for `@RestController`s in this package | Actuator stays at `/actuator/**` (blocked by Nginx, used by health checks). |
| 2 | Article schema | ADR-004 V1 has `body text` + `body_html`; ADR-009 §9 changes it | V1 is written directly with `body jsonb`, `body_schema_version smallint`, `body_text`, `word_count` | Nothing has been deployed, so no ALTER migration is needed. |
| 3 | SSO tables | "ADR-004: add registered redirect URIs and SSO codes" (not specified) | `V8__sso.sql`: `product_redirect_uris (product_id, uri UNIQUE)`, `sso_codes (code_hash UNIQUE, user_id, product_id, client_id, redirect_uri, code_challenge, expires_at, used_at, cancelled_at)` | Required by ADR-001 §5.7. Should be copied into ADR-004. |
| 4 | RLS | ADR-001 §5.6: RLS on every table | `V9__enable_row_level_security.sql` (no policies, not forced) | Implements the rule in a migration. |
| 5 | Reminders | V7 only if reminder emails are built | Table created, no code writes to it | Keeps the migration list of ADR-004 §7; emails are phase 4. |
| 6 | Seed credential | Hash from a Flyway placeholder | Inserted only when `DD_CLIENT_SECRET_HASH` is non-empty | Local/test have no SSM; local uses `LocalDevSeeder` instead. |
| 7 | Revalidation | Retries 1 s, 5 s, 30 s and report `PENDING_RETRY` "if all fail" | First attempt inline (3 s timeout); on failure the response says `PENDING_RETRY` at once and the three retries continue in the background | Waiting ~36 s inside the admin's request is not acceptable. |
| 8 | Body normalisation | "Attributes: all others are dropped" | Unknown attributes **and `null`-valued attributes** are dropped; defaults are not filled in; `content` kept only if sent | Matches the shared `contracts/article/normalize` fixture written for the portal. Error paths point at the node / mark (`body.content[1]`, `...marks[0]`) as in `contracts/article/invalid/index.json`. |
| 9 | Extra error reasons | §3.5/§12 list | Added `INVALID_GRANT` (400, SSO), `URL_NOT_ALLOWED` (400, link preview), `FREE_PLAN_EXISTS` (409, second active free plan), `METHOD_NOT_ALLOWED` (405), `NOT_ACCEPTABLE` (406). `RATE_LIMITED` (429) is also returned by the API when the image-resize queue is full | Cases the ADR does not name. |
| 10 | `/sso/codes` unknown client | not specified | `400` (field `clientId`), not `401` | A `401` would make the portal refresh the user's token and retry (rule A1), which cannot help. |
| 11 | Webhook body | "always `{received:true}`" | Also on `403` and `5xx`; Status API failure → `502` (Midtrans retries any non-2xx) | As specified; `502` chosen within "5xx". |
| 12 | Idempotency window | Same key within 24 h returns the first response | Same key returns the first transaction **forever** (unique `(user_id, idempotency_key)`), in its current state | The DB constraint in ADR-004 is not time-bounded. |
| 13 | Checkout concurrency | not specified | The user row is locked (`SELECT … FOR UPDATE`) during checkout; the PENDING row is committed before Snap is called; Snap failure → `FAILED` + `502` | Prevents two pending transactions from parallel clicks. |
| 14 | Amount mismatch history | "flag the transaction" | `needs_review = true` and a history row `PENDING → PENDING` with note `amount mismatch: expected …, got …` (written once) | `to_status` is NOT NULL; the note is what the admin needs. |
| 15 | Refund of a renewal payment | "if this payment is linked to the subscription → CANCELLED, end_date = now" | Implemented literally: refunding any payment linked to the row cancels the whole subscription | One row per product (R2); partial-period refunds are out of scope. |
| 16 | Response additions (non-breaking, §3.1) | shapes in §5–§10 | `AdminProduct.planCount` + `redirectUris`; `AdminArticle.readingMinutes`; `PublicArticle.wordCount`; `AdminArticleSummary.version`; `statusHistory[].fromStatus`; SSO token `tokenType`/`expiresIn` | Useful to the portal; callers ignore unknown fields. |
| 17 | `PUT /admin/articles/{id}` | `version` "not required on create" | `version` **and** `body` are required on PUT | PUT replaces the resource; a missing body would silently wipe the article. |
| 18 | Admin transaction dates | "ISO dates" | `from`/`to` accept `YYYY-MM-DD` (UTC, `to` inclusive) or an ISO instant | Friendlier filters. |
| 19 | Public article list sort | not listed | `sort=publishedAt` only (default `publishedAt,desc`) | Sort allow-list rule. |
| 20 | Product code in credential ids | example `dd_live_…` | `<initials>_live_<8 chars>` (e.g. `qt_live_…` for `quote-tool`); local seed uses `dd_local_…` | — |
| 21 | Credential verification | Argon2id per request | Argon2id, plus a 60 s in-memory cache of successful verifications (keyed by SHA-256 of the secret, dropped on revoke) | Argon2id costs tens of ms; products call on every request. |
| 22 | Users from custom tokens | email from Google | If a token has no `email` claim the row stores `""` | `users.email` is NOT NULL. |
| 23 | Image limits | 10 MB | Also rejects images over 50 megapixels (`400 IMAGE_UNREADABLE`) | Decompression-bomb guard. |
| 24 | Nginx | per-prefix limits | Added a `sso` zone (10/min) and `link-preview` zone (30/min) | ADR-001 §5.5 / ADR-009 §5.5 ask for them. |

## Not done / known gaps

- Renewal reminder emails (UC-13 step 3, phase 4) — table only.
- OpenAPI ↔ ADR-003 contract test in CI (ADR-003 D4) — springdoc serves `/v1/openapi.json` (disabled in prod), no diff test yet.
- `HttpMidtransGateway`, `S3ImageStorage` and `FirebaseAdminTokenMinter` are not exercised by tests
  (no sandbox keys / LocalStack / service account here); tests use the fake/local implementations.
- Link preview is tested for its SSRF rejections only; the happy path needs outbound network.
- `infra/terraform/nginx.conf.tpl` and the root `Makefile` (`apps/core-service`) were not updated.
