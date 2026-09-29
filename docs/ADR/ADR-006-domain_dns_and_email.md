# ADR-006: Domain, DNS, and Email Sending Provider

| Author   | Dewa Surya Ariesta                                                                                                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date     | 29 September 2026                                                                                                                                                                                                                                                                  |
| Status   | Proposed                                                                                                                                                                                                                                                                           |
| Deciders | Dewa Surya Ariesta                                                                                                                                                                                                                                                                 |
| Related  | [PRD](../PRD.md), [ADR-001](./ADR-001-initial_technology.md), [ADR-002](./ADR-002-usecase.md), [ADR-003](./ADR-003-api-contract.md), [ADR-004](./ADR-004-initial_schema_model.md), [ADR-005](./ADR-005-ads_and_consent.md), [ADR-008](./ADR-008-portal_structure.md) |

## 1. Overview

Every earlier ADR writes `<domain>` and leaves three questions to ADR-006: where the domain is registered, who serves its DNS, and which provider sends the hub's email.

| Already decided or assumed                                                                                   | Where                              |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| DNS "can live on Cloudflare for free, together with the site".                                                | ADR-001 §5.2                       |
| API on `api.<domain>`, staging on `api-staging.<domain>`; images on `cdn.<domain>`; products on `<product>.<domain>`. | ADR-003 §3, §5                     |
| Nginx terminates TLS with Let's Encrypt; the EC2 instance has an Elastic IP so DNS never changes.             | ADR-001 §5.4, §5.5                 |
| Renewal reminder emails 7 and 1 days before the end date (phase 4, optional); `subscription_reminders` table. | ADR-002 UC-13 step 3; ADR-004 §5.3 |
| `/privacy` lists a contact email; the site CSP names `<cloudfront-domain>` and `<firebase-auth-domain>`.      | ADR-005 §6.3, §8                   |
| **Left open:** registrar, DNS records and who owns them, TLS between Cloudflare and EC2, mailboxes, the sending provider, and email authentication. | ADR-001 §9; ADR-003 §11.2 |

### 1.1 What the code does today

| Item                                        | State                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/portal/wrangler.jsonc`                | `NEXT_PUBLIC_SITE_URL=https://dewasuryahub.com`, `NEXT_PUBLIC_API_URL=https://api.dewasuryahub.com/v1`. No `routes`; the Worker is reachable only on `*.workers.dev`. |
| `apps/nginx/nginx.conf`, `infra/terraform/nginx.conf` | `server_name _;`, no TLS config for a named host.                                              |
| `infra/terraform`                           | EC2 instance **without** an Elastic IP (`TERRAFORM_EC2_DEPLOY.md` flags this). No DNS, ACM, or SES resources. |
| Firebase sign-in                            | `signInWithPopup` with `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (default `<project-id>.firebaseapp.com`).    |
| `V7__subscription_reminders.sql`            | Table exists; nothing writes to it. No email code in `coreservices`.                                   |
| `users` table                               | No language column, so the API cannot pick the language for an email.                                  |

## 2. Decision Drivers

| #   | Driver                                                                                                                              | Source                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| D1  | US$0 fixed cost, or as close to it as possible. Pay per use only.                                                                   | ADR-001 D1                 |
| D2  | The site runs on Cloudflare Workers. A Worker **custom domain** needs the zone on Cloudflare DNS (full setup).                       | ADR-001 §5.2               |
| D3  | DNS records that point at AWS (Elastic IP, CloudFront, ACM and SES verification) must be reproducible, not hand-typed.              | ADR-001 D8                 |
| D4  | Visitors are in Indonesia, SEA, and Europe; one international domain for all of them.                                               | ADR-001 §1                 |
| D5  | Hub email is **transactional only**: reminders, receipts, and admin alerts. Low volume (tens to a few hundred per month at first).  | ADR-002 UC-13              |
| D6  | Emails must reach the inbox. Gmail and Yahoo require SPF, DKIM, and DMARC for senders.                                              | Mailbox provider rules     |
| D7  | No new long-lived secrets if an IAM role can do the job. Secrets that do exist go in SSM.                                           | ADR-001 §5.3, §5.10        |
| D8  | One developer: few consoles and few accounts. Account recovery must not depend on the thing being recovered.                        | ADR-001 §1                 |

## 3. Decision Summary

| #   | Decision                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | Domain **`dewasuryahub.com`**, registered at **Cloudflare Registrar** (at-cost price, auto-renew, registrar lock, DNSSEC) (§4).                                                                   |
| S2  | **Cloudflare DNS** is authoritative. Records pointing at AWS or used for email are managed by **Terraform** (Cloudflare provider). Worker hostnames are managed by **Wrangler** (§5).             |
| S3  | Host names: apex = site, `www` → 301 to apex, `api` = EC2 (proxied), `cdn` = CloudFront (DNS only), `<product>` = each product. Staging names are reserved and created only when staging exists (§5.2). |
| S4  | `api` is **proxied by Cloudflare**. Nginx uses a **Cloudflare Origin CA** certificate with SSL mode **Full (strict)**. Port 443 is open only to Cloudflare's IP ranges; port 80 is closed (§6). |
| S5  | Incoming mail uses **Cloudflare Email Routing** (free). A few role addresses forward to Dewa's personal inbox. No paid mailbox (§7).                                                              |
| S6  | Outgoing mail uses **Amazon SES** (`ap-southeast-1`), called through the SES v2 API with the EC2 **instance role**, so there is no API key. Easy DKIM, custom MAIL FROM `mail.dewasuryahub.com`, DMARC (§8). |
| S7  | The API sends every email through a **transactional outbox** (`email_outbox`) and a ShedLock job. No tracking pixels, no link tracking, no marketing email (§9).                                  |

## 4. Domain and Registrar

**Decision.** Use `dewasuryahub.com` (already written into `wrangler.jsonc`) and register it at **Cloudflare Registrar**.

**Rationale.**

- `.com` works for every target region (D4). A `.id` domain needs Indonesian ID documents and suits only one region.
- Cloudflare Registrar charges the registry's price with no markup, which is about US$10–11 per year for `.com`. Check the current price before buying.
- The zone must be on Cloudflare anyway (D2). With the registrar in the same account there is one less console, and DNSSEC is one click (D8).

**Rules.**

| #   | Rule                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **Auto-renew on**, a card on file that does not expire soon, and registrar lock on. A lapsed domain takes down the site, the API, SSO, and all email at once.      |
| R2  | **DNSSEC on** (Cloudflare signs the zone and publishes DS at the registry itself).                                                                                |
| R3  | The login email for Cloudflare, the AWS root user, Firebase/Google Cloud, Midtrans, and AdSense is **Dewa's personal address, not an `@dewasuryahub.com` address**. Otherwise a DNS or domain problem also locks Dewa out of the account that fixes it. |
| R4  | Cloudflare account: hardware key or TOTP 2FA, and **scoped API tokens** only (for example `Zone.DNS:Edit` on this one zone for Terraform). Never the Global API Key. |
| R5  | WHOIS privacy is on by default at Cloudflare; keep it.                                                                                                             |
| R6  | Do not register extra TLDs (`.id`, `.net`) now. If brand misuse appears, register them and 301-redirect them to the apex.                                          |

## 5. DNS

### 5.1 Who owns which record

Having two tools edit one zone is safe only if each record has exactly one owner:

| Owner                      | Records                                                                                                                  | Why                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Wrangler** (`wrangler.jsonc`) | Worker custom domains (apex, and later `staging`). Wrangler creates their DNS records and edge certificates itself.   | Terraform would conflict with the records Wrangler creates. The site's config stays in the site's repo. |
| **Terraform** (`infra/terraform`, Cloudflare provider v5 `cloudflare_dns_record`) | `www`, `api`, `cdn`, ACM validation, SES DKIM and MAIL FROM, DMARC, SPF, verification TXT records, CAA. | Values come from AWS resources in the same plan (Elastic IP, CloudFront domain, DKIM tokens) (D3). |
| **Cloudflare console**     | Email Routing MX/TXT (added by the Email Routing setup), zone settings (SSL mode, HSTS, redirect rule, security).          | Email Routing manages its own records. Zone settings can move to Terraform later.     |
| **Each product**           | Its own `<product>` record, in its own repo or IaC.                                                                       | A product deploys on its own schedule.                                                |

The Terraform Cloudflare token (R4) is read from `CLOUDFLARE_API_TOKEN` in the shell or CI, never from `terraform.tfvars`.

### 5.2 Records

Zone `dewasuryahub.com`. "Proxied" means Cloudflare's orange cloud.

| Name                          | Type    | Value                                                          | Proxied | Owner      | Phase |
| ----------------------------- | ------- | -------------------------------------------------------------- | ------- | ---------- | ----- |
| `@`                           | Worker custom domain | Worker `dewa-surya-hub-portal`                    | yes     | Wrangler   | 1     |
| `www`                         | `AAAA`  | `100::` (placeholder; the redirect rule answers)               | yes     | Terraform  | 1     |
| `api`                         | `A`     | EC2 Elastic IP                                                 | yes     | Terraform  | 1     |
| `cdn`                         | `CNAME` | `dxxxxxxxx.cloudfront.net`                                     | **no**  | Terraform  | 1     |
| `_xxxx.cdn`                   | `CNAME` | ACM DNS validation value                                       | no      | Terraform  | 1     |
| `@`                           | `TXT`   | `google-site-verification=…` (Search Console; also used for Google OAuth branding) | — | Terraform | 1 |
| `@`                           | `CAA`   | `0 issue "amazon.com"` (Cloudflare adds its own CAs automatically) | —   | Terraform  | 1     |
| `@`                           | `MX` ×3 | `route1/2/3.mx.cloudflare.net`                                 | —       | Email Routing | 1  |
| `@`                           | `TXT`   | `v=spf1 include:_spf.mx.cloudflare.net ~all`                   | —       | Email Routing | 1  |
| `_dmarc`                      | `TXT`   | `v=DMARC1; p=none; rua=mailto:<cloudflare-dmarc-address>; adkim=r; aspf=r` | — | Terraform | 1 |
| `<token>._domainkey` ×3       | `CNAME` | `<token>.dkim.amazonses.com`                                   | no      | Terraform  | 3     |
| `mail`                        | `MX`    | `10 feedback-smtp.ap-southeast-1.amazonses.com`                | —       | Terraform  | 3     |
| `mail`                        | `TXT`   | `v=spf1 include:amazonses.com ~all`                            | —       | Terraform  | 3     |
| `documentdoctor`              | per product                                                  | —       | —       | Product    | 2     |
| `staging`, `api-staging`      | as apex / `api`, pointing at staging resources                 | yes     | Wrangler / Terraform | when staging exists |

Notes:

- **`cdn` is not proxied.** CloudFront is already a CDN; putting Cloudflare in front would cache twice and hide CloudFront's cache headers. CloudFront gets the alias `cdn.dewasuryahub.com` with an **ACM certificate in `us-east-1`** (a CloudFront requirement), validated by the DNS record above.
- **`www`** is answered by a Cloudflare **Single Redirect** rule: `https://www.dewasuryahub.com/*` → `https://dewasuryahub.com/${1}`, 301, query string kept. This is free (Free plan allows 10 rules) and does not use Worker requests.
- **Products** get `<productCode>.dewasuryahub.com` by default. They are on the same site (same registrable domain) as the hub, and AdSense and `ads.txt` on the root domain also cover them (see §12, ADR-005 R6). A product may use its own domain instead; SSO works with any exact HTTPS `redirect_uri` (ADR-001 §5.7).
- **Staging** Workers and APIs are protected with Cloudflare Access (free for up to 50 users) and send `X-Robots-Tag: noindex`, so they never appear in search results.

### 5.3 Worker settings

`apps/portal/wrangler.jsonc` gains:

```jsonc
  "routes": [
    { "pattern": "dewasuryahub.com", "custom_domain": true }
  ],
  // The production site is served only on its own domain (no duplicate content on *.workers.dev).
  "workers_dev": false,
  // Per-version preview URLs stay on for PR previews (ADR-005 §4: no real ads there).
  "preview_urls": true,
```

### 5.4 Zone settings (console)

| Setting                       | Value                                         | Why                                                              |
| ----------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| SSL/TLS mode                  | **Full (strict)**                             | Cloudflare checks the origin certificate (§6).                   |
| Always Use HTTPS              | On                                            |                                                                  |
| Minimum TLS version           | 1.2                                           |                                                                  |
| HSTS                          | On after a week without TLS problems: `max-age=31536000; includeSubDomains`. No `preload` yet. | Once HSTS is on, it is hard to undo; all subdomains must already serve HTTPS. |
| Bot Fight Mode                | **Off**                                       | On the Free plan it cannot skip a path, so it could block Midtrans webhooks. |
| WAF custom rule               | Skip managed challenges for `api.dewasuryahub.com/v1/webhooks/midtrans` | Midtrans retries, but a blocked webhook delays access (ADR-001 §5.8). |
| Caching on `api`              | Cache Rule: **bypass** for `api.dewasuryahub.com/*` | API responses are per-user or already short-lived; Cloudflare must never cache them. |
| DMARC Management              | On                                            | Free DMARC report reader; gives the `rua` address used above.    |

## 6. TLS and Traffic Between Cloudflare and EC2

**Decision.** `api` is proxied. Cloudflare terminates TLS for the visitor and opens a second TLS connection to Nginx, which presents a **Cloudflare Origin CA** certificate (15-year validity, trusted only by Cloudflare). This **replaces Let's Encrypt/certbot** from ADR-001 §5.5.

**Rationale.**

- The EC2 IP is hidden, and Cloudflare absorbs DDoS traffic for free. Only Cloudflare can reach the origin.
- Nothing needs renewing: no certbot timer and no port 80 for HTTP-01.
- The same hostname works for the portal (browser), products (server to server), and Midtrans (webhook).

**Rules.**

| #   | Rule                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Security group: **443 only from Cloudflare's IPv4 ranges** (<https://www.cloudflare.com/ips-v4>), kept in a Terraform variable; **80 closed**. SSH stays as ADR-001 §5.4. |
| T2  | Nginx restores the client IP, or `limit_req` would count every user as one of a few Cloudflare IPs and block everyone at once: `set_real_ip_from <each Cloudflare range>; real_ip_header CF-Connecting-IP;`. |
| T3  | A `default_server` block with `ssl_reject_handshake on;` refuses any host name other than `api.dewasuryahub.com` (and `api-staging…`), so other Cloudflare zones cannot use this origin. |
| T4  | Origin certificate and key are stored as SSM `SecureString` (ADR-001 §5.10) and written to the instance by `user_data`. They are never committed.                      |
| T5  | Cloudflare's free proxy limits: request body 100 MB, response timeout 100 s. Image uploads (10 MB max, ADR-001 §5.9) and all API calls fit easily.                    |
| T6  | **Fallback** if the proxy must be turned off: switch `api` to DNS-only and issue a Let's Encrypt certificate with certbot's **DNS-01** challenge (Cloudflare plugin, token with `Zone.DNS:Edit`). Keep this procedure in `infra/terraform/docs`. |

```nginx
# apps/nginx/nginx.conf (shape, not final code)
set_real_ip_from 173.245.48.0/20;   # …one line per Cloudflare range
real_ip_header   CF-Connecting-IP;

server {
    listen 443 ssl default_server;
    ssl_reject_handshake on;
}

server {
    listen 443 ssl;
    http2 on;
    server_name api.dewasuryahub.com;
    ssl_certificate     /etc/nginx/tls/origin.pem;
    ssl_certificate_key /etc/nginx/tls/origin.key;
    # upstream, rate limits, /actuator block … as ADR-001 §5.5
}
```

**Firebase.** Add `dewasuryahub.com` (and later `staging.dewasuryahub.com`) to Firebase **Authorized domains**. Keep the default `authDomain` (`<project-id>.firebaseapp.com`). The portal uses `signInWithPopup`, which works under browser third-party storage partitioning. The ADR-005 CSP value `<firebase-auth-domain>` is `https://<project-id>.firebaseapp.com`.

## 7. Incoming Mail: Cloudflare Email Routing

**Decision.** Turn on Cloudflare Email Routing for the zone and forward a small set of role addresses to Dewa's personal inbox.

| Address                      | Used for                                                                  |
| ---------------------------- | ------------------------------------------------------------------------- |
| `hello@dewasuryahub.com`     | General contact (`/about`, footer).                                       |
| `support@dewasuryahub.com`   | `Reply-To` on every hub email; product support.                           |
| `privacy@dewasuryahub.com`   | Data requests under UU PDP / GDPR; named in `/privacy` (ADR-005 §6.3).    |
| `billing@dewasuryahub.com`   | Merchant contact in the Midtrans dashboard; payment questions.            |
| `notifications@dewasuryahub.com` | The `From` address of hub email (§8); forwarded so replies that ignore `Reply-To` are not lost. |
| `postmaster@`, `abuse@`      | RFC 2142 role addresses.                                                  |

- **Catch-all off** (drop), to keep spam out of the personal inbox.
- The personal inbox is a destination only. It is not the login for provider accounts (R3).
- Replying **as** `support@` from Gmail is optional. It uses Gmail "Send mail as" with SES SMTP credentials (a separate IAM user limited to `ses:SendRawEmail` for `support@`). Set this up only if replies become frequent.

**Rationale.** It costs US$0, needs no mailbox, and adds no new vendor. A paid mailbox (Google Workspace, about US$7 per user per month) is not needed for a handful of messages.

## 8. Outgoing Mail: Amazon SES

**Decision.** Send hub email with **Amazon SES v2** in `ap-southeast-1`, from the Spring Boot API, with the EC2 **instance role**.

**Rationale.**

- Pay per use: about **US$0.10 per 1,000 emails**. At the expected volume the cost rounds to zero (D1, D5). New AWS accounts may have free-tier credits that cover it.
- No API key: the instance role already exists (ADR-001 §5.3). The AWS SDK v2 is already a dependency for S3 (D7).
- The identity, DKIM, MAIL FROM, configuration set, and alarms are all Terraform resources in the same plan as the DNS records (D3).
- Same region as the API.

### 8.1 Identity and authentication

| Item                          | Value                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| Identity                      | Domain `dewasuryahub.com` (`aws_sesv2_email_identity`), **Easy DKIM, 2048-bit**; 3 CNAMEs in §5.2.       |
| Custom MAIL FROM              | `mail.dewasuryahub.com` (`aws_sesv2_email_identity_mail_from_attributes`, on MX failure: use default). SPF then passes **and** aligns with the `From` domain. |
| `From`                        | `Dewa Surya Hub <notifications@dewasuryahub.com>`                                                       |
| `Reply-To`                    | `support@dewasuryahub.com`                                                                              |
| DMARC                         | `p=none` from phase 1, so reports show any spoofing before we send. After 4 weeks of clean reports from real SES traffic, change to `p=quarantine`, then `p=reject`. |
| TLS                           | Configuration set `hub-transactional` with TLS policy **Require**.                                      |

DMARC passes through DKIM (aligned `d=dewasuryahub.com`) and through SPF (aligned MAIL FROM subdomain), so a forwarded message that breaks one check still passes.

### 8.2 Account and reputation

| #   | Rule                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | New SES accounts start in the **sandbox** (sending only to verified addresses). That is enough for admin alerts in phase 3 (E3). **Request production access before phase 4.** Describe the use case: transactional only, own users, suppression list, low volume. |
| M2  | **Account-level suppression list** on for `BOUNCE` and `COMPLAINT`. SES then drops mail to addresses that bounced or complained; the API does not keep its own list. |
| M3  | Reputation metrics on the configuration set. CloudWatch alarms go to an SNS topic that emails Dewa's **personal** address: bounce rate ≥ 2 %, complaint rate ≥ 0.05 %. SES starts a review at about 5 % bounces or 0.1 % complaints; check the current thresholds in the SES docs. |
| M4  | IAM: the instance role gets `ses:SendEmail` only on the identity and configuration set ARNs, with condition `ses:FromAddress = notifications@dewasuryahub.com`. |
| M5  | EC2 blocks outbound port 25 by default. The API uses the HTTPS API, not SMTP, so no request to AWS is needed.                                          |

## 9. What the Hub Sends and How

### 9.1 Email catalog

| #   | Email                            | To             | Trigger                                                                                     | Phase             |
| --- | -------------------------------- | -------------- | ------------------------------------------------------------------------------------------- | ----------------- |
| E1  | Renewal reminder (D7, D1)        | User           | UC-13 step 3 scheduler                                                                      | 4 (optional)      |
| E2  | Payment received (receipt)       | User           | Webhook moves a transaction to `PAID` (ADR-002 UC-08, ADR-003 §9)                               | 4                 |
| E3  | Admin alert                      | Dewa (verified) | Transaction marked `needsReview`; webhook signature failures above a threshold per hour    | 3                 |

- **Until E2 exists**, Midtrans's own customer email is the receipt: enable customer email notifications in the Midtrans dashboard and pass `customer_details.email` in the Snap request (ADR-001 §5.8).
- **No marketing or newsletter email.** A newsletter needs opt-in consent, a one-click unsubscribe (`List-Unsubscribe`), and a separate decision.
- **No open or click tracking.** Links point straight at `dewasuryahub.com` (no redirect domain), and there are no pixels, so no consent is needed (ADR-005 §6.1).
- Emails E1 and E2 are sent because of a purchase the user made. They carry a link to `/account/subscriptions`, not an unsubscribe link.

### 9.2 Transactional outbox

A reminder or receipt must be sent **once**, even when SES is down, the API restarts, or two instances run during a blue/green deploy. The API never calls SES inside a business transaction. Instead:

1. The business code (webhook handler, reminder job) inserts an `email_outbox` row **in the same transaction** as its own change. For E1 this is the same transaction that inserts `subscription_reminders`, whose primary key already prevents a second reminder for the same period (ADR-004 §5.3).
2. A `@Scheduled` job (every minute, **ShedLock**) takes up to 20 due `PENDING` rows with `FOR UPDATE SKIP LOCKED`, renders them, calls SES, and stores `SENT` + the SES message ID.
3. Temporary errors (throttling, 5xx, timeout): `attempts + 1`, `next_attempt_at` = now + 1, 5, 30, 120 minutes. After 5 attempts: `FAILED`, logged at `ERROR`.
4. Permanent errors (`MessageRejected`, `MailFromDomainNotVerified`, `AccountSendingPaused`): `FAILED` at once. Sending pauses for the whole account, so it also raises E3 through the log alarm, not through email.

**`email_outbox`** (new, `V11__email_outbox.sql`, phase 3):

| Column                | Type           | Null | Default     | Notes                                                                            |
| --------------------- | -------------- | ---- | ----------- | -------------------------------------------------------------------------------- |
| `id`                  | `uuid`         | no   |             | PK.                                                                              |
| `kind`                | `varchar(32)`  | no   |             | `CHECK IN ('RENEWAL_REMINDER','PAYMENT_RECEIVED','ADMIN_ALERT')`.                |
| `user_id`             | `uuid`         | yes  |             | FK → `users.id`. Null for admin alerts.                                          |
| `to_address`          | `varchar(320)` | no   |             | Copied at enqueue time.                                                          |
| `locale`              | `varchar(5)`   | no   | `'en'`      | `id` or `en`.                                                                    |
| `payload`             | `jsonb`        | no   | `'{}'`      | Template values only (plan name, end date, amount, order ID). No tokens.         |
| `dedupe_key`          | `varchar(200)` | no   |             | **Unique.** For example `PAYMENT_RECEIVED:<orderId>`, `RENEWAL_REMINDER:D7:<subscriptionId>:<endDate>`. |
| `status`              | `varchar(16)`  | no   | `'PENDING'` | `CHECK IN ('PENDING','SENT','FAILED')`.                                          |
| `attempts`            | `smallint`     | no   | `0`         |                                                                                  |
| `next_attempt_at`     | `timestamptz`  | no   | `now()`     |                                                                                  |
| `provider_message_id` | `varchar(100)` | yes  |             | SES `MessageId`.                                                                 |
| `last_error`          | `varchar(500)` | yes  |             | Error class and message, truncated.                                              |
| `created_at`          | `timestamptz`  | no   | `now()`     |                                                                                  |
| `sent_at`             | `timestamptz`  | yes  |             |                                                                                  |

Index: `(status, next_attempt_at) WHERE status = 'PENDING'`. RLS on, with no policies, like every other table (`V9`). A daily job **deletes rows older than 90 days**, so email addresses are not kept longer than needed.

### 9.3 Language

`users` gains `locale varchar(5) NOT NULL DEFAULT 'en'`, `CHECK IN ('id','en')` (`V12__user_locale.sql`, phase 4). The portal sends `Accept-Language: <route locale>` on `POST /me/session` (ADR-003 §6.1), and the API stores `id` if the value starts with `id` and `en` otherwise. The value is set from the UI the user actually uses, not from the Google profile.

### 9.4 Code shape

| Part                                   | Detail                                                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Package                                | `com.sdewa.coreservices.notification`                                                                                     |
| `EmailSender` (interface)              | `send(RenderedEmail) → messageId`. `SesEmailSender` (SES v2 `SendEmail`, simple content, configuration set `hub-transactional`) and `LoggingEmailSender` (dev and tests: logs the rendered email, sends nothing). |
| `EmailOutbox`                          | `enqueue(kind, user, payload, dedupeKey)`. A duplicate `dedupe_key` is ignored (`ON CONFLICT DO NOTHING`).               |
| Templates                              | Thymeleaf, `resources/mail/{kind}.{locale}.html` and `.txt`. Every email has an HTML part and a plain-text part. No remote images; inline CSS only. |
| Config (`hub.mail.*`)                  | `enabled`, `provider` (`ses` \| `log`), `from`, `reply-to`, `admin-to`, `configuration-set`. Production values are not secret and live in `application-prod.yml`. |
| Tests                                  | Integration test with Testcontainers: enqueue twice → one row; SES failure → retry schedule; `LoggingEmailSender` in all tests. |

## 10. Cost

| Item                                               | Cost                                   |
| -------------------------------------------------- | -------------------------------------- |
| `dewasuryahub.com` at Cloudflare Registrar         | ~US$10–11 / year (~US$0.9 / month)     |
| Cloudflare DNS, DNSSEC, Origin CA, redirect rule, Email Routing, DMARC Management | US$0          |
| ACM public certificate for `cdn`                    | US$0                                   |
| Amazon SES                                         | US$0.10 / 1,000 emails (≈ US$0 at launch) |
| CloudWatch alarms (2) + SNS email                  | ≈ US$0.20 / month                      |
| **Total**                                          | **≈ US$1–2 / month**                   |

Check current prices on the Cloudflare and AWS pricing pages before relying on these figures.

## 11. Rollout

| Step | Phase | Work                                                                                                                                                   |
| ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | P1    | Register `dewasuryahub.com` at Cloudflare Registrar (if not yet). Auto-renew, lock, DNSSEC, 2FA, recovery email off the domain (R1–R4).                 |
| 2    | P1    | Add `routes` and `workers_dev: false` to `wrangler.jsonc`; deploy; add the `www` record and redirect rule.                                            |
| 3    | P1    | Terraform: attach the **Elastic IP** (ADR-001 §5.4, missing today), add the Cloudflare provider, `api` record, Cloudflare-only security group, Origin CA cert from SSM. Update Nginx (§6). |
| 4    | P1    | Terraform: ACM cert in `us-east-1` + validation record, CloudFront alias, `cdn` record. Replace `<cloudfront-domain>` in the CSP (ADR-005 §8).         |
| 5    | P1    | Search Console TXT; Firebase authorized domain; zone settings (§5.4) except HSTS.                                                                      |
| 6    | P1    | Email Routing with the addresses in §7; DMARC Management; `_dmarc` record `p=none`. `/privacy` uses `privacy@` (ADR-005 step 1).                       |
| 7    | P1+1 w | Turn on HSTS after a week without TLS errors.                                                                                                          |
| 8    | P3    | Terraform: SES identity, DKIM, MAIL FROM records, configuration set, suppression list, alarms, IAM policy. `V11__email_outbox.sql`, `notification` package, E3 in sandbox. Midtrans customer emails on. |
| 9    | P3+4 w | Move DMARC to `p=quarantine` if reports are clean.                                                                                                     |
| 10   | P4    | Request SES production access. `V12__user_locale.sql`, `Accept-Language` on `POST /me/session`. Build E1 and E2. Later, move DMARC to `p=reject`.       |

## 12. Alternatives Considered

| Option                                                                  | Why not (now)                                                                                                                                         |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Porkbun / Namecheap** as registrar                                    | Similar price, but DNS moves to Cloudflare anyway, so it is one more account with no gain.                                                            |
| **Route 53** registrar and hosted zone                                  | About US$14/year + US$0.50/month per zone. Worker custom domains need the zone on Cloudflare; CNAME (partial) setup is a Business plan feature.        |
| **`.id` domain**                                                        | Needs Indonesian ID documents, and it signals "Indonesia only" to SEA and EU visitors (D4).                                                           |
| **`api` DNS-only** (grey cloud) with Let's Encrypt                      | Simpler path, but exposes the EC2 IP, has no DDoS shield, and needs certbot and port 80. **Kept as the fallback** (T6).                               |
| **Proxy `cdn` through Cloudflare** instead of CloudFront                 | Two CDNs in a row, and CloudFront was chosen for S3 origin access (ADR-001 §5.9). Moving images to R2 + Cloudflare would be a separate decision.       |
| **Resend**                                                              | Best developer experience; free tier 3,000/month (100/day). But it needs an API key secret and one more vendor. **First fallback** if SES production access is refused; it fits the same `EmailSender` interface. |
| **Postmark**                                                            | Excellent deliverability, but paid from the first message (about US$15/month).                                                                        |
| **Brevo, Mailgun** free tiers                                           | Low daily limits, marketing-oriented tools, API key secret. No advantage over SES here.                                                               |
| **SendGrid**                                                            | Free plan retired; paid plans cost more than SES at this volume.                                                                                      |
| **Gmail SMTP** from a personal account                                  | Sending limits, ToS risk, and the `From` domain would not align, so DMARC fails.                                                                      |
| **Postfix on the EC2 instance**                                         | AWS blocks port 25 by default, a fresh IP has no reputation, and it is one more service to run.                                                       |
| **Cloudflare Email Service** (sending from Workers)                     | Would keep everything in Cloudflare, but sending is new and the sender is the Spring Boot API on EC2, not a Worker. Revisit when it is generally available. |
| **Google Workspace / Zoho Mail** mailboxes                              | Real mailboxes and sending as the domain, but Workspace is paid and Zoho free has limits. Forwarding is enough for a handful of messages.              |
| **Custom Firebase `authDomain`** (proxy `/__/auth/*` through the Worker) | Shows the hub's domain on the Google sign-in popup instead of `firebaseapp.com`, but adds a proxy route and CSP changes. Not needed with `signInWithPopup`; revisit (§14). |
| **Call SES directly in the webhook handler** (no outbox)                 | Simpler, but an SES error either fails the webhook (Midtrans retries and sends again) or loses the email.                                             |

## 13. Consequences

### 13.1 Positive

- About US$1–2 a month for the domain, DNS, TLS, incoming mail, and outgoing mail together.
- The origin is hidden behind Cloudflare, and certificates renew themselves or never expire.
- Every DNS record that depends on AWS is created from the same Terraform plan as the resource it points at.
- No email API key exists: SES is reached with the instance role.
- The outbox sends each email once, even with retries and two API instances running during a deploy.
- SPF, DKIM, and DMARC are aligned from the first email.

### 13.2 Negative and risks

| Risk                                                                                         | Mitigation                                                                                                                              |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Registrar, DNS, site, and incoming mail are all in one Cloudflare account. If it is compromised or locked, everything is lost at once. | Hardware key / TOTP, scoped tokens (R4), recovery email off the domain (R3). Transfer-out stays possible (after 60 days).      |
| Domain expires.                                                                              | Auto-renew, valid card, and a yearly calendar check (R1).                                                                               |
| A Cloudflare outage takes down the API too, not only the site.                               | Accepted, since the site depends on Cloudflare anyway. Fallback T6 (DNS-only + DNS-01 certificate) is documented.                          |
| Wrong real-IP config makes Nginx rate-limit all users as one Cloudflare IP.                  | T2, plus a deploy check: `limit_req` log lines must show visitor IPs, not Cloudflare IPs.                                               |
| The Cloudflare IP list changes, and the security group or `set_real_ip_from` becomes stale.  | Both come from one Terraform variable; check <https://www.cloudflare.com/ips/> each quarter (the list changes rarely).                  |
| Cloudflare security features block Midtrans webhooks.                                        | Bot Fight Mode off, WAF skip rule (§5.4). Midtrans retries, and the admin "sync" action (ADR-003) recovers any missed status.              |
| SES production access refused or delayed.                                                    | E3 works in the sandbox. Request early in phase 4 with a clear use case. Resend is the fallback behind the same interface (§12).        |
| New domain lands in spam.                                                                    | Aligned DKIM/SPF, DMARC, no tracking, plain content with a text part, low volume. Check headers with Gmail "Show original" before launch. |
| Account-level SES pause from bounces (for example, a Google account's address was deleted).  | Suppression list (M2), alarms well below the SES limits (M3). Emails go only to addresses from a Google sign-in, which are verified.     |
| Email addresses in `email_outbox` are extra personal data.                                   | 90-day retention job; listed in `/privacy` as "transactional email to your Google account address".                                     |
| HSTS with `includeSubDomains` breaks a future HTTP-only subdomain.                           | No HTTP-only subdomains allowed. No `preload` until the setup has been stable for months.                                               |

## 14. When to Revisit

- SES production access is refused, or deliverability stays poor (use Resend or Postmark).
- Hub email volume passes a few thousand a month, or marketing email is wanted (newsletter consent, unsubscribe, separate sending subdomain such as `news.dewasuryahub.com` to protect transactional reputation).
- Users ask to turn off reminders (add a preference in `/account`).
- Cloudflare Email Service is generally available and the API moves to Workers.
- The Google sign-in popup showing `firebaseapp.com` hurts trust (custom `authDomain`).
- The portal moves to its own origin (ADR-005 §11), which adds `app.dewasuryahub.com`.
- A product moves to its own domain and wants the hub to send email for it.

## 15. Changes to Other ADRs

| ADR     | Section                 | Change                                                                                                                              |
| ------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| ADR-001 | §5.4 setup rules        | Security group: 443 from Cloudflare ranges only; port 80 closed (T1).                                                               |
| ADR-001 | §5.5 Nginx              | TLS with a Cloudflare Origin CA certificate instead of Let's Encrypt; real client IP from `CF-Connecting-IP`; reject unknown hosts (§6). |
| ADR-001 | §5.10 scope             | Add Cloudflare DNS records (Terraform Cloudflare provider), ACM for `cdn` in `us-east-1`, SES resources.                            |
| ADR-001 | §6 cost                 | Add domain (~US$1/month) and SES (≈ US$0).                                                                                          |
| ADR-001 | §9                      | ADR-006 status → Proposed, with a link to this file.                                                                                |
| ADR-002 | UC-13 step 3            | Provider: Amazon SES, through `email_outbox` (§9.2). Add UC-08 note: enqueue E2 on payment (phase 4).                               |
| ADR-003 | §3 base URLs, CORS      | `<domain>` = `dewasuryahub.com`. CORS allow-list: `https://dewasuryahub.com`, `https://staging.dewasuryahub.com`, `http://localhost:3000`. |
| ADR-003 | §6.1 `POST /me/session` | Reads `Accept-Language` and stores `users.locale` (§9.3).                                                                           |
| ADR-003 | §11.2 outbound calls    | "Email provider (ADR-006)" → Amazon SES v2 `SendEmail`, used by the outbox job.                                                     |
| ADR-004 | §5.1 `users`            | Add `locale` (`V12`, phase 4).                                                                                                      |
| ADR-004 | §5.3, migration list    | Add `email_outbox` (`V11`, phase 3). `subscription_reminders` stays and is written in the same transaction as the E1 outbox row.   |
| ADR-005 | §6.3, §8                | Contact: `privacy@dewasuryahub.com`. `<cloudfront-domain>` → `cdn.dewasuryahub.com`; `<firebase-auth-domain>` → `<project-id>.firebaseapp.com`. |
| ADR-005 | §9 R6                   | A product on `<product>.dewasuryahub.com` is covered by the root domain's AdSense site and `ads.txt`; only a product on its own domain needs its own. |
| ADR-008 | API client              | `POST /me/session` sends `Accept-Language` with the route locale.                                                                   |
