# ADR-002: Use Cases

| Author   | Dewa Surya Ariesta                                           |
| -------- | ------------------------------------------------------------ |
| Date     | 28 September 2026                                            |
| Status   | Proposed                                                     |
| Deciders | Dewa Surya Ariesta                                           |
| Related  | [PRD](../PRD.md), [ADR-001](./ADR-001-initial_technology.md) |

## 1. Overview

The [PRD](../PRD.md) says **what** users want. [ADR-001](./ADR-001-initial_technology.md) says **which tools** we use (Next.js on Vercel, Spring Boot + PostgreSQL on EC2, Firebase Auth, Midtrans, S3 + CloudFront).

This document says **how each feature works, step by step**. Each feature is written as a _use case_:

| Part                 | Meaning                                    |
| -------------------- | ------------------------------------------ |
| Who                  | The actor that starts it.                  |
| Needs                | What must be true before it starts.        |
| When                 | The trigger.                               |
| PRD                  | The PRD story or requirement it covers.    |
| Steps                | What the user does and what the system does. |
| If something goes wrong | The error cases and what happens.       |
| Result               | What is true at the end.                   |

Use this document when you build a feature. Frontend and backend follow the same steps. Endpoint details are in [ADR-003](./ADR-003-api-contract.md); tables and columns are in [ADR-004](./ADR-004-initial_schema_model.md).

## 2. Glossary

| Term              | Definition                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Hub               | This project: the website + API that holds users, subscriptions, payments, and blog articles.                |
| Connected product | Another app (for example Document Doctor) that uses the hub for sign-in and to check whether a user has paid. |
| Firebase ID token | A signed string Firebase gives the browser after Google sign-in. It is sent in every API call to prove who the user is. |
| Plan              | A priced offering of a product, for example "Document Doctor Pro, monthly". A free plan has price 0.         |
| Subscription      | A user's access to one product on one plan, from `start_date` to `end_date`.                                 |
| Entitlement       | "Is this user allowed to use the paid features of this product right now?" – yes or no, plus the plan's `features`. |
| Midtrans Snap     | The Midtrans payment popup. The user pays inside it (QRIS, virtual account, e-wallet, card).                 |
| Webhook           | An HTTP call that Midtrans sends to **our** API to tell us a payment status changed.                        |
| ISR               | Next.js feature: pages are built once, cached, and rebuilt when we ask (revalidate) or after some time.      |
| Revalidate        | Tell Next.js "this page changed, rebuild it".                                                               |
| Idempotent        | Safe to run twice. Running it again gives the same result and does not double anything.                     |

## 3. Actors

### 3.1 People and systems that start an action

| Actor             | Who is it                                                                  |
| ----------------- | -------------------------------------------------------------------------- |
| Visitor           | Anyone on the public website who is not signed in.                         |
| SaaS User         | A signed-in user (role `USER`).                                            |
| Administrator     | Dewa (role `ADMIN`, stored in PostgreSQL).                                 |
| Connected product | Document Doctor and future apps.                                           |
| Scheduler         | A timed job inside Spring Boot (`@Scheduled`), for example every hour.     |
| Midtrans          | Sends payment webhooks to our API.                                         |

### 3.2 External services the hub calls

Firebase Auth (sign-in), Midtrans (payment), S3 / CloudFront (images), Vercel (hosts Next.js), search engines (read public pages).

## 4. Answers to the PRD Open Questions

These are the answers from the PRD, with the detail this document needs to build them.

| No  | PRD question                               | PRD answer                                   | What it means for the use cases                                                                                   |
| --- | ------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Payment gateway and currency?              | Midtrans for initial                         | Midtrans Snap, **IDR only**. QRIS is enabled in Snap (G5).                                                        |
| 2   | SSO approach for connected products?       | OAuth 2.0 with Firebase                      | Google sign-in through one shared Firebase project. Products ask the hub API about the user (UC-06, UC-07).       |
| 3   | Document Doctor plans and pricing?         | For now, the paid plan removes the ads       | A **free plan** (price 0, ads shown) and a **paid plan** (ads removed). The difference lives in the plan's `features`. |
| 4   | Sign up on the hub or in a product?        | Both                                         | The first time the hub API sees a valid Firebase token, from either place, it creates the user.                  |
| 5   | Show usage per plan?                       | Should be, but later                         | Not in this release. Plan limits are stored in `features` so usage can be added later.                           |
| 6   | Refunds in the platform?                   | No                                           | No refund feature in the hub. Dewa refunds in the Midtrans dashboard; the hub only receives the `refund` status from the webhook (UC-09). |

Two more decisions follow from the PRD goals:

| Topic    | Decision                                                                                                                                      |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Payments | **One-time payments only** (G5). Each purchase pays for one period (for example one month). There is no automatic recurring charge.         |
| Renewal  | To keep access, the user buys the plan again (UC-12). There is nothing to "cancel": a subscription simply ends at `end_date` if it is not renewed. |

## 5. Use Case List

Priority: **P0** = required for launch, **P1** = soon after launch, **P2** = later. Phase = release phase in PRD §9.

| ID    | Use case                   | Who               | PRD                         | Backend module            | Priority | Phase |
| ----- | -------------------------- | ----------------- | --------------------------- | ------------------------- | -------- | ----- |
| UC-01 | Read article               | Visitor           | V-1.1, FR-C1, FR-C5         | `content`                 | P0       | 1     |
| UC-02 | View about & products      | Visitor           | V-1.2                       | `content`, `product`      | P0       | 1     |
| UC-03 | Browse by category / tag   | Visitor           | V-1.3                       | `content`                 | P1       | 4     |
| UC-04 | Sign in / sign up          | Visitor           | FR-U1, FR-U4, OQ4           | `identity`                | P0       | 2     |
| UC-05 | View my profile            | SaaS User         | US-2.1                      | `identity`                | P0       | 2     |
| UC-06 | Join a connected product   | Connected product | FR-U1, FR-U3                | `identity`                | P0       | 2     |
| UC-07 | Check entitlement          | Connected product | FR-U2                       | `subscription`            | P0       | 2–3   |
| UC-08 | Buy a plan                 | SaaS User         | US-2.2, G5, FR-P1           | `payment`, `subscription` | P0       | 3     |
| UC-09 | Handle payment webhook     | Midtrans          | FR-P2, FR-P3                | `payment`, `subscription` | P0       | 3     |
| UC-10 | View my subscriptions      | SaaS User         | US-2.4                      | `subscription`            | P0       | 3     |
| UC-11 | View my payment history    | SaaS User         | US-2.3                      | `payment`                 | P0       | 3     |
| UC-12 | Renew a subscription       | SaaS User         | Release plan phase 4        | `payment`, `subscription` | P1       | 4     |
| UC-13 | Expire subscriptions       | Scheduler         | US-2.4                      | `subscription`            | P0       | 3     |
| UC-14 | View users                 | Administrator     | A-3.1                       | `admin`, `identity`       | P0       | 2     |
| UC-15 | View payment history       | Administrator     | A-3.2                       | `admin`, `payment`        | P0       | 3     |
| UC-16 | Create / edit article      | Administrator     | A-3.3, A-3.4, FR-C3         | `content`                 | P0       | 1     |
| UC-17 | Publish / unpublish article | Administrator    | A-3.6, FR-C2, FR-C5         | `content`                 | P0       | 1     |
| UC-18 | Manage article list        | Administrator     | Persona 4.3 "Manage post content" | `content`           | P0       | 1     |
| UC-19 | Manage media library       | Administrator     | A-3.7, FR-C4                | `media`                   | P0       | 1     |
| UC-20 | Manage categories & tags   | Administrator     | A-3.8, FR-C3                | `content`                 | P0       | 1     |
| UC-21 | Manage products & plans    | Administrator     | G3, NFR Extensibility       | `product`                 | P0       | 3     |

UC-21 has no PRD user story, but the hub cannot sell plans or connect a new product without it. Until the admin screen exists (phase 3), Document Doctor and its plans are seeded by a database migration (ADR-004 §8).

## 6. Status Rules

These statuses are used by both the API and the database. Do not add other statuses without updating this document.

### 6.1 Transaction (a payment attempt)

| Status     | Meaning                                  | Can change to    |
| ---------- | ---------------------------------------- | ---------------- |
| `PENDING`  | Checkout created, user has not paid yet. | `PAID`, `FAILED` |
| `PAID`     | Money received.                          | `REFUNDED` only  |
| `FAILED`   | Payment denied, cancelled, or expired.   | nothing (final)  |
| `REFUNDED` | Money returned to the user by Dewa in the Midtrans dashboard. | nothing (final) |

A transaction **never** goes back to `PENDING`.

How the Midtrans status maps to our status:

| Midtrans `transaction_status`                           | Our status |
| ------------------------------------------------------- | ---------- |
| `pending`                                               | `PENDING`  |
| `settlement`, or `capture` with `fraud_status = accept` | `PAID`     |
| `deny`, `cancel`, `expire`, `failure`                   | `FAILED`   |
| `refund`, `partial_refund`                              | `REFUNDED` |

### 6.2 Subscription (access to a product)

| Status      | Meaning                                              | How it gets here                                |
| ----------- | ---------------------------------------------------- | ----------------------------------------------- |
| `ACTIVE`    | User has access until `end_date`.                    | A payment becomes `PAID` (UC-09).               |
| `EXPIRED`   | `end_date` passed and the user did not renew.        | Scheduler (UC-13).                              |
| `CANCELLED` | Access ended early because the payment was refunded. | Midtrans `refund` webhook (UC-09).              |

An `EXPIRED` or `CANCELLED` subscription becomes `ACTIVE` again when the user pays (UC-12).

**Important rules**

| #   | Rule                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------- |
| R1  | A subscription row is created **only** when a payment is confirmed. There is no "pending subscription".        |
| R2  | One user has **at most one** subscription row per product. Renewing updates the same row.                      |
| R3  | A user is **entitled** when `status = ACTIVE` **and** `now < end_date`.                                        |
| R4  | A free plan (price 0) is never bought. A user without a subscription gets the free plan's `features` (UC-07). |

## 7. Rules for Every Signed-in Request

These apply to UC-04 to UC-21:

| #   | Rule                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------- |
| A1  | The browser sends `Authorization: Bearer <Firebase ID token>`. Spring Security checks it.                       |
| A2  | Invalid or expired token → `401`. The frontend gets a fresh token from Firebase and tries **once** more.        |
| A3  | Endpoints under `/admin/**` need `role = ADMIN` → otherwise `403`.                                              |
| A4  | The user is always taken from the token, never from a user id in the request.                                   |

## 8. Use Cases

### 8.1 Public website (Visitor)

#### UC-01 Read article

| Who   | Visitor (and search engines)       |
| ----- | ---------------------------------- |
| Needs | The article is `PUBLISHED`.        |
| When  | Visitor opens `/blog/<slug>`.      |
| PRD   | V-1.1, FR-C1, FR-C5                |

**Steps**

1. Vercel returns the cached page.
2. The page shows the title, cover image, body, category, tags, and publish date. The cover image uses CloudFront at 480 / 960 / 1600 px (`srcset`).
3. The page `<head>` has SEO data: title, meta description, canonical URL, Open Graph tags, and `Article` JSON-LD (built with Next.js `generateMetadata`).
4. If the page is not cached yet, Next.js calls `GET /public/articles/{slug}`, builds the page, and caches it.

**If something goes wrong**

| Case                                  | What happens                                   |
| ------------------------------------- | ---------------------------------------------- |
| Slug not found, or article is a draft | Show the `404` page (`notFound()`).            |
| Old slug of a renamed article         | Permanent redirect (`301`) to the new slug.    |
| API is down                           | Vercel keeps showing the old cached page.      |

**Result:** The visitor reads the article without signing in. The article is in `sitemap.xml`, and `robots.txt` allows it.

#### UC-02 View about & products

| Who  | Visitor                                    |
| ---- | ------------------------------------------ |
| When | Visitor opens `/about` or `/products`.     |
| PRD  | V-1.2                                      |

**Steps**

1. `/about` shows Dewa's profile as a full-stack developer, skills, and portfolio (static page).
2. `/products` calls `GET /public/products` and lists active products with their public plans and prices in IDR. For Document Doctor this shows Free (with ads) and Pro (no ads).
3. Each product has two buttons: "Learn more" (goes to the product website) and "Get started" (sign in with UC-04, then buy with UC-08).

#### UC-03 Browse by category / tag

| Who  | Visitor                                                        |
| ---- | -------------------------------------------------------------- |
| When | Visitor opens `/blog/category/<slug>` or `/blog/tag/<slug>`.   |
| PRD  | V-1.3                                                          |

**Steps**

1. Show only `PUBLISHED` articles in that category or tag, newest first, with pages (`?page=n`).
2. Each item shows title, excerpt, small cover image (480 px), and publish date.
3. The page title and description come from the category or tag name, using an async `generateMetadata` that fetches the category or tag from the API (the PRD's research note in §4.3).

**If something goes wrong**

| Case         | What happens                                        |
| ------------ | --------------------------------------------------- |
| Unknown slug | `404`.                                              |
| No articles  | Show an empty message with a link back to the blog. |

### 8.2 Sign-in and profile

#### UC-04 Sign in / sign up

| Who  | Visitor                                                                                 |
| ---- | --------------------------------------------------------------------------------------- |
| When | Visitor clicks "Sign in", or opens a page that needs sign-in (account, checkout).       |
| PRD  | FR-U1, FR-U4, OQ2, OQ4                                                                   |

**Steps**

1. Frontend opens the Firebase **Google** sign-in popup.
2. Firebase gives the browser an ID token.
3. Frontend calls `POST /me/session` with the token.
4. Backend checks the token and looks for the user by Firebase `uid`.
5. If the user does not exist, backend creates it from the token data (`uid`, email, name, picture) with `role = USER`.
6. If the user exists, backend refreshes email, name, and picture from the token (the profile follows the Google account, US-2.1) and saves `last_sign_in_at`.
7. Backend returns the profile and role. Frontend sends the user back to the page they came from, or to `/account`.

**If something goes wrong**

| Case                    | What happens                                     |
| ----------------------- | ------------------------------------------------ |
| User closes the popup   | Stay on the sign-in page; nothing is created.    |
| Token invalid           | `401`; the frontend shows the sign-in button again. |

**Result:** The user is signed in and has exactly one user row in the database.

**Sign out:** Frontend calls Firebase `signOut()`. No backend call is needed – the backend does not keep sessions.

#### UC-05 View my profile

| Who  | SaaS User (signed in)                  |
| ---- | -------------------------------------- |
| When | User opens `/account/profile`.         |
| PRD  | US-2.1                                 |

**Steps**

1. Frontend calls `GET /me`.
2. The page shows name, email, and avatar (from the Google account), the date the user joined, and the products the user has joined.
3. The page says the profile comes from the Google account, with a link to the Google account settings for changes.

**If something goes wrong**

| Case                                    | What happens                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| User changed their name/photo in Google | The new data shows after the next sign-in (UC-04 step 6).                    |

**Result:** The user sees their profile. The profile is not edited in the hub.

#### UC-06 Join a connected product

| Who   | Connected product (for example Document Doctor)                                       |
| ----- | ------------------------------------------------------------------------------------- |
| Needs | The product is registered in the hub (UC-21) and uses the same Firebase project.      |
| When  | A user signs in to Document Doctor.                                                   |
| PRD   | FR-U1, FR-U3                                                                           |

**Steps**

1. The user signs in with Google inside Document Doctor and gets a Firebase ID token.
2. Document Doctor's **backend** calls `POST /products/{productCode}/members` with the user's token **and** its own client credential.
3. Hub finds or creates the user (same as UC-04 steps 4–6).
4. Hub saves that this user joined this product (with the join date), if not saved already.
5. Hub returns the user profile and entitlement (UC-07).

**If something goes wrong**

| Case                                                 | What happens                    |
| ---------------------------------------------------- | ------------------------------- |
| Unknown or inactive product, or wrong credential     | `401` / `403`.                  |
| User already joined                                  | Nothing changes; return `200`.  |

**Result:** The hub knows the user joined the product. The admin sees it in UC-14.

#### UC-07 Check entitlement

| Who  | Connected product                                                    |
| ---- | -------------------------------------------------------------------- |
| When | The product needs to know if the user can use a paid feature (for example "hide ads"). |
| PRD  | FR-U2                                                                 |

**Steps**

1. The product backend calls `GET /products/{productCode}/entitlements/me` with the user's token and its client credential.
2. Hub loads the user's subscription for that product.
3. Hub returns: `entitled` (true/false), plan, status, `end_date`, and the plan's `features`.

**If something goes wrong**

| Case                                     | What happens                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| No subscription, or not entitled (R3)    | `entitled: false`, plus the free plan's `features` (for Document Doctor: ads on). |

**Rules**

| #   | Rule                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------ |
| E1  | The product may cache the answer for up to 5 minutes. It must check again after the user returns from checkout. |
| E2  | The hub is the only source of truth. Products do not keep their own copy of subscriptions.             |

### 8.3 Payments and subscriptions

#### UC-08 Buy a plan

| Who   | SaaS User (signed in)                    |
| ----- | ---------------------------------------- |
| Needs | The plan is active and costs more than 0. |
| When  | User clicks "Buy" on a plan.             |
| PRD   | US-2.2, G5, FR-P1                        |

**Steps**

1. Frontend shows a summary (product, plan, period, price in IDR, "one-time payment, no automatic renewal"). User confirms.
2. Frontend calls `POST /checkout` with `planId`.
3. Backend checks the plan and the user's current subscription.
4. Backend creates a transaction: unique `order_id`, user, plan, amount, `IDR`, status `PENDING`.
5. Backend calls the Midtrans Snap API, saves the Snap token, and returns it to the frontend.
6. Frontend opens the Snap popup. The user pays with QRIS, virtual account, e-wallet, or card.
7. When the popup closes, frontend shows "Payment processing" and calls `GET /me/transactions/{orderId}` every few seconds until the status is not `PENDING`. For QRIS and virtual account, show the payment instructions.
8. When UC-09 marks the transaction `PAID`, frontend shows success and a link to `/account/subscriptions`.

**If something goes wrong**

| Case                                                                   | What happens                                                                                       |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| User already has an entitled subscription on the **same** plan         | Treat it as a renewal (UC-12).                                                                     |
| User already has an entitled subscription on a **different** plan      | `409`. Changing plan in the middle of a period is **not** supported yet.                          |
| User already has an unexpired `PENDING` transaction for the same plan  | Return the old Snap token; do not create a new transaction.                                        |
| Midtrans API error or timeout                                          | Set the transaction to `FAILED`; show "Payment could not be started, please try again".            |
| User closes the popup without paying                                   | The transaction stays `PENDING` until Midtrans sends `expire`.                                     |
| Payment failed                                                         | UC-09 sets `FAILED`. The user sees the reason and can try again.                                   |

**Result:** ⚠️ Access is given **only** by UC-09 (the webhook). Never trust the browser popup callback or redirect – a user could fake it.

#### UC-09 Handle payment webhook

| Who  | Midtrans                                  |
| ---- | ----------------------------------------- |
| When | Midtrans calls `POST /webhooks/midtrans`. |
| PRD  | FR-P2, FR-P3, NFR Security, NFR Reliability |

**Steps**

1. Check the signature: `signature_key = SHA512(order_id + status_code + gross_amount + server_key)`. This proves the call really came from Midtrans.
2. Call the Midtrans Status API for this `order_id`. Use **that** response as the truth, not the webhook body.
3. Start one database transaction (`@Transactional`) and lock the transaction row (`SELECT ... FOR UPDATE`) so two webhooks cannot update it at the same time.
4. Map the Midtrans status to our status (§6.1). If nothing changed, stop.
5. Check the amount matches what we saved. Then update status, payment method, Midtrans reference, and `paid_at`, and add a row to the status history.
6. If the new status is `PAID`, create or extend the subscription:
   - No subscription yet → create one: `ACTIVE`, `start_date = now`, `end_date = now + period`.
   - Subscription exists → `end_date = max(now, end_date) + period`, `status = ACTIVE`, plan = the paid plan.
7. If the new status is `REFUNDED` and this payment is linked to the subscription → set the subscription `CANCELLED` and `end_date = now`.
8. Link the subscription to the transaction, commit, return `200`.

**If something goes wrong**

| Case                                             | What happens                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Bad signature                                    | `403`, log a warning, change nothing.                                              |
| Unknown `order_id`                               | Log it and return `200` (so Midtrans stops sending it).                            |
| Status change not allowed (e.g. `PAID` → `FAILED`) | Ignore, log, return `200`.                                                       |
| Amount does not match                            | Do **not** give access; flag the transaction for the admin; return `200`.          |
| Database or Status API error                     | Return `5xx`. Midtrans sends the webhook again later. Steps 3–8 are idempotent.    |

**Result:** Each status change for an `order_id` is applied exactly once, even if Midtrans sends the webhook many times.

#### UC-10 View my subscriptions

| Who  | SaaS User                               |
| ---- | --------------------------------------- |
| When | User opens `/account/subscriptions`.    |
| PRD  | US-2.4                                  |

**Steps**

1. Frontend calls `GET /me/subscriptions`.
2. For each product, show: product, plan name, status, and the end date ("Active until …" or "Expired on …").
3. Show buttons based on status:

| Status                   | Show                                                   |
| ------------------------ | ------------------------------------------------------ |
| `ACTIVE`                 | "Active until <date>", Renew (phase 4)                 |
| `EXPIRED` or `CANCELLED` | "Ended on <date>", Buy again                           |

**If something goes wrong**

| Case             | What happens                                    |
| ---------------- | ----------------------------------------------- |
| No subscriptions | Empty message with a link to `/products`.       |

#### UC-11 View my payment history

| Who  | SaaS User                         |
| ---- | --------------------------------- |
| When | User opens `/account/payments`.   |
| PRD  | US-2.3                            |

**Steps**

1. Frontend calls `GET /me/transactions?page=n`.
2. Show a list, newest first: date, product, plan, amount (IDR), payment method, status (`PENDING`, `PAID`, `FAILED`, `REFUNDED`).
3. For a `PENDING` transaction, the user can open the payment instructions again until it expires.

**Rule:** A user only sees **their own** transactions (A4).

#### UC-12 Renew a subscription

| Who   | SaaS User                                                     |
| ----- | ------------------------------------------------------------- |
| Needs | The user has a subscription for the product (any status).     |
| When  | User clicks "Renew" or "Buy again" (UC-10).                   |
| PRD   | Release plan phase 4 ("renewal self-service"), G5             |

**Steps**

1. Frontend starts UC-08 with the same plan.
2. After payment, UC-09 sets `end_date = max(now, end_date) + period`. Renewing early never loses paid days.

**If something goes wrong**

| Case                            | What happens                                               |
| ------------------------------- | ---------------------------------------------------------- |
| The old plan is not sold anymore | The user picks another active plan of the same product.   |

**Result:** The subscription is `ACTIVE` with a later end date.

The API already supports this in phase 3 (buying the same plan again). Phase 4 adds the "Renew" button and optional reminder emails (UC-13 step 3).

#### UC-13 Expire subscriptions

| Who  | Scheduler                     |
| ---- | ----------------------------- |
| When | Every hour.                   |
| PRD  | US-2.4 (status is correct)    |

**Steps**

1. Find `ACTIVE` subscriptions where `end_date <= now` and set them to `EXPIRED`.
2. Only update rows that still have `status = ACTIVE`, so running the job twice changes nothing.
3. _(Phase 4, optional.)_ Find `ACTIVE` subscriptions that end in 7 days or 1 day and send a renewal reminder email. Save that the email was sent so it is not sent twice. The email provider is chosen in ADR-006.

**Rules**

| #   | Rule                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------- |
| S1  | UC-07 checks `end_date` itself. If this job runs late, nobody gets extra free access.                       |
| S2  | During a blue/green deploy two API instances run; a database lock (ShedLock) makes sure only one runs the job. |

### 8.4 Administrator

#### UC-14 View users

| Who  | Administrator                    |
| ---- | -------------------------------- |
| When | Admin opens `/admin/users`.      |
| PRD  | A-3.1, persona 4.3               |

**Steps**

1. The admin sees a table of users: name, email, joined products, created date, last sign-in, and a transaction summary (number of paid transactions, total paid in IDR). Search by name or email; filter by product; paged.
2. The admin opens a user to see the profile, joined products, subscriptions, and transactions.

**Result:** The admin knows who uses which product and how much they paid. This screen is read-only.

#### UC-15 View payment history

| Who  | Administrator                          |
| ---- | -------------------------------------- |
| When | Admin opens `/admin/transactions`.     |
| PRD  | A-3.2, FR-P3                           |

**Steps**

1. Filter by user, product, status, and date range. The list is paged, newest first.
2. Show totals for the filter: number of transactions and total `PAID` amount (IDR).
3. Open one to see `order_id`, Midtrans reference, amount, payment method, status history, and linked subscription.
4. Transactions flagged by UC-09 (amount mismatch) are marked "Needs review".

**Extra:** If a status looks wrong, the admin clicks "Sync with Midtrans". Backend calls the Midtrans Status API and runs UC-09 steps 3–8.

**Refunds:** There is no refund button (OQ6). Dewa refunds in the Midtrans dashboard; Midtrans then sends a `refund` webhook and UC-09 marks the transaction `REFUNDED`.

#### UC-16 Create / edit article

| Who  | Administrator                                            |
| ---- | -------------------------------------------------------- |
| When | Admin clicks "New article" or opens an article.          |
| PRD  | A-3.3, A-3.4, FR-C3                                      |

**Steps**

1. The admin writes the article in the Markdown editor.
2. The admin fills: title, slug (auto from title, can edit), excerpt, cover image (from UC-19), one category, tags, meta title, meta description.
3. The admin can insert images from the media library into the body.
4. The admin saves. A new article is saved as `DRAFT`.
5. If the article is already `PUBLISHED`, saving also rebuilds the public pages (UC-17 step 3).

**If something goes wrong**

| Case                                    | What happens                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| Slug already used                       | `409`; the admin picks another.                                                       |
| Required fields missing                 | `400` with field errors.                                                              |
| Slug of a published article changes     | Keep the old slug and redirect it (`301`) to the new one, so old links still work.    |
| The article was saved in another tab    | `409`; the admin reloads before saving (optimistic lock).                             |

**Result:** The article is saved. The public site only changes if the article is published.

#### UC-17 Publish / unpublish article

| Who   | Administrator                                           |
| ----- | ------------------------------------------------------- |
| Needs | Title, slug, excerpt, and category are filled.          |
| When  | Admin clicks "Publish" or "Unpublish".                  |
| PRD   | A-3.6, FR-C2, FR-C5                                     |

**Steps**

1. Backend sets the status to `PUBLISHED` (and saves `published_at` the first time), or back to `DRAFT`.
2. Backend commits to the database.
3. Backend calls the Next.js revalidate endpoint (protected by a secret) for: the article page, blog list, its category and tag pages, and `sitemap.xml`.
4. The public site shows (or hides) the article on the next request.

**If something goes wrong**

| Case                   | What happens                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| Revalidate call fails  | The change stays saved. Backend retries a few times and the admin sees a warning. ISR time-based revalidation refreshes the pages later. |

**Result:** Only published articles are public and in the sitemap.

#### UC-18 Manage article list

| Who  | Administrator                          |
| ---- | -------------------------------------- |
| When | Admin opens `/admin/articles`.         |
| PRD  | Persona 4.3 "Manage post content"      |

**Steps**

1. Search by title. Filter by status, category, and tag. The list is paged.
2. The admin can open (UC-16), publish/unpublish (UC-17), or delete an article.
3. Delete asks for confirmation. If the article is published, unpublish and revalidate it first, then delete.

#### UC-19 Manage media library

| Who  | Administrator                                           |
| ---- | ------------------------------------------------------- |
| When | Admin opens `/admin/media`, or picks an image in the editor. |
| PRD  | A-3.7, FR-C4                                            |

**Steps**

1. The admin uploads an image (JPEG, PNG, or WebP, max 10 MB) and writes alt text.
2. Backend checks type and size, fixes rotation (EXIF), removes metadata, and makes WebP copies at 480, 960, and 1600 px (Scrimage, limited thread pool).
3. Backend uploads them to S3 as `images/<content-hash>/<width>.webp` and saves an image record (keys, width, height, alt text).
4. The library shows thumbnails. The admin can search, copy the CloudFront URL, or insert the image into an article.
5. The admin can delete an image that is not used.

**If something goes wrong**

| Case                                  | What happens                                                    |
| ------------------------------------- | --------------------------------------------------------------- |
| Wrong type or too big                 | Rejected (by Nginx or the API) with a clear message.            |
| Same image uploaded again (same hash) | Reuse the old record; do not upload again.                      |
| Image is used by an article           | Cannot delete; show which articles use it.                      |

#### UC-20 Manage categories & tags

| Who  | Administrator                                    |
| ---- | ------------------------------------------------ |
| When | Admin opens `/admin/categories` or `/admin/tags`. |
| PRD  | A-3.8, FR-C3                                     |

**Steps**

1. Create a category or tag (name; slug is auto, can edit).
2. Rename one → published pages using it are revalidated.
3. Delete one.

**If something goes wrong**

| Case                          | What happens                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Name or slug already exists   | `409`.                                                                                    |
| Category still has articles   | Cannot delete. Move the articles to another category first (every article needs one category). |
| Deleting a tag                | Removes it from all articles (after confirmation).                                        |

#### UC-21 Manage products & plans

| Who  | Administrator                          |
| ---- | -------------------------------------- |
| When | Admin opens `/admin/products`.         |
| PRD  | G3, NFR Extensibility, release plan phase 4 (onboard more products) |

**Steps**

1. Create a product: code (for example `document-doctor`), name, description, website URL, active flag. Backend creates a client credential (used in UC-06 and UC-07) and shows the secret **only once**.
2. Add plans: code, name, price (IDR), period (monthly / yearly; none for a free plan), `features` (for example `{ "removeAds": true }`), public flag, active flag.
3. Deactivate a plan to stop new sales.
4. Create a second credential and revoke the old one to rotate a secret.

**Rules**

| #   | Rule                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------- |
| P1  | Never delete or change the price of a plan that was already sold. Make a new plan instead, so old transactions still make sense. |
| P2  | Adding a new product needs only these steps – no database schema change (NFR Extensibility).            |

## 9. PRD to Use Case Mapping

| PRD item | Use case(s)          | PRD item | Use case(s)          |
| -------- | -------------------- | -------- | -------------------- |
| V-1.1    | UC-01                | A-3.1    | UC-14                |
| V-1.2    | UC-02                | A-3.2    | UC-15                |
| V-1.3    | UC-03                | A-3.3    | UC-16                |
| US-2.1   | UC-05                | A-3.4    | UC-16                |
| US-2.2   | UC-08, UC-09         | A-3.6    | UC-17                |
| US-2.3   | UC-11                | A-3.7    | UC-19                |
| US-2.4   | UC-10, UC-13         | A-3.8    | UC-20                |
| FR-U1    | UC-04, UC-06         | FR-C1    | UC-01                |
| FR-U2    | UC-07                | FR-C2    | UC-17                |
| FR-U3    | UC-06, UC-14         | FR-C3    | UC-16, UC-20         |
| FR-U4    | UC-04, §7            | FR-C4    | UC-19                |
| FR-P1    | UC-08                | FR-C5    | UC-01, UC-17         |
| FR-P2    | UC-09                | G3       | UC-21                |
| FR-P3    | UC-08, UC-09, UC-15  | G5       | UC-08, UC-12         |

## 10. Later (not in this release)

From the PRD non-goals and "need to cover later" list, and features left out of this release:

| Item                                                        | Source           | Note                                                             |
| ----------------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| Post interactions: up/down vote, comment, tag other users   | PRD §3.2, §11    | Needs visitor accounts on the blog; new use cases and tables.   |
| Feedback about the application and system                    | PRD §11          | New use case.                                                    |
| Share a post to social media                                 | PRD §11          | Frontend only (share links + Open Graph, already in UC-01).     |
| Quotation and freelance flow tools                           | PRD §11          | Separate product; would connect through UC-06 / UC-07.          |
| Usage per plan                                               | OQ5              | Products report usage to the hub; needs its own ADR.            |
| Deactivate a user, admin grant/extend of subscriptions, audit log | Earlier draft | Not in the PRD stories. Add when support needs them.       |
| Refund button in the hub                                     | OQ6              | Refunds stay in the Midtrans dashboard.                          |
| Automatic recurring payments                                 | G5               | One-time payments only for now.                                  |
| Change plan in the middle of a period                        | UC-08            | Needs proration rules.                                           |

## 11. Consequences

### 11.1 Positive

- Every PRD story has at least one use case, so nothing is forgotten.
- Access has one simple rule: `ACTIVE` and `now < end_date`. Only a confirmed payment (UC-09) gives access.
- One-time payments keep billing simple: no card storage, no retry logic for failed auto-charges.
- Error cases are decided before coding.

### 11.2 Negative and risks

| Risk                                                                    | Mitigation                                                                                        |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Users must remember to renew, which may lower the renewal rate (PRD §8 G4). | Clear end date in UC-10; reminder emails in phase 4 (UC-13 step 3, ADR-006).                  |
| Users cannot change plan in the middle of a period.                     | Document Doctor has one paid plan at launch; add proration later if needed.                       |
| No admin tools to fix a user's access by hand.                          | "Sync with Midtrans" (UC-15) fixes most payment problems; add admin grant/extend if support needs it. |
| Products cache entitlement, so access can be a few minutes out of date. | Short cache; re-check after checkout (ADR-003 §8.5).                                              |
| UC-21 and UC-18 have no PRD user story.                                 | Add them to the PRD in the next version.                                                          |
