# ADR-002: Use Cases

| Field    | Value                                                             |
| -------- | ----------------------------------------------------------------- |
| Author   | Dewa Surya Ariesta                                                |
| Date     | 28 September 2026                                                 |
| Status   | Proposed                                                          |
| Deciders | Dewa Surya Ariesta                                                |
| Related  | [PRD v0.2](../PRD.md), [ADR-001](./ADR-001-initial_technology.md) |

---

## 1. What is this document?

The [PRD](../PRD.md) says **what** users want. [ADR-001](./ADR-001-initial_technology.md) says **which tools** we use (Next.js on Vercel, Spring Boot + PostgreSQL on EC2, Firebase Auth, Midtrans, S3 + CloudFront).

This document says **how each feature works, step by step**. Each feature is written as a *use case*:

- **Who** starts it
- **When** it starts
- **Steps** – what the user does and what the system does
- **If something goes wrong** – the error cases
- **Result** – what is true at the end

Use this document when you build a feature. Frontend and backend should both follow the same steps.

## 2. Words you need to know

| Word                | Meaning                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| Hub                 | This project: the website + API that holds users, subscriptions, payments, and blog articles.             |
| Connected product   | Another app (for example Document Doctor) that uses the hub for login and to check if a user has paid.    |
| Firebase ID token   | A signed string Firebase gives the browser after login. We send it in every API call to prove who we are. |
| Entitlement         | "Is this user allowed to use the paid features of this product right now?" – yes or no.                  |
| Midtrans Snap       | The Midtrans payment popup. The user pays inside it (VA, QRIS, e-wallet, card).                           |
| Webhook             | An HTTP call that Midtrans sends to **our** API to tell us a payment status changed.                      |
| ISR                 | Next.js feature: pages are built once, cached, and rebuilt when we ask (revalidate) or after some time.   |
| Revalidate          | Tell Next.js "this page changed, rebuild it".                                                             |
| JSONB               | A PostgreSQL column type that stores JSON. We use it for plan limits (`features`).                        |
| Idempotent          | Safe to run twice. Running it again gives the same result and does not double anything.                   |
| Audit log           | A table that records who changed what and when (for admin actions).                                       |

## 3. Who uses the system

**People and systems that start an action:**

| Actor             | Who is it                                                                   |
| ----------------- | --------------------------------------------------------------------------- |
| Visitor           | Anyone on the public website who is not logged in.                          |
| SaaS User         | A logged-in user (role `USER`).                                             |
| Administrator     | Dewa (role `ADMIN`, stored in PostgreSQL).                                  |
| Connected product | Document Doctor and future apps.                                            |
| Scheduler         | A timed job inside Spring Boot (`@Scheduled`), for example every hour.      |
| Midtrans          | Sends payment webhooks to our API.                                          |

**External services we call:** Firebase Auth (login), Midtrans (payment), S3 / CloudFront (images), Vercel (hosts Next.js), search engines (read public pages).

## 4. Decisions for the PRD's open questions

The PRD has some open questions. Until another ADR changes them, we use these answers:

| Question                                  | Our answer                                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| OQ1 Which payment gateway and currency?   | Midtrans Snap, IDR only.                                                                                    |
| OQ2 How does login work across products?  | All products use the same Firebase project. Products ask the hub API about the user. Details in ADR-003.  |
| OQ3 Document Doctor plans and prices?     | Plans are just data in the database (UC-24). A free plan = a plan with price 0, no checkout.               |
| OQ4 Sign up on the hub or in a product?   | **Both.** The first time the hub API sees a valid Firebase token, it creates the user.                     |
| OQ5 Show usage per plan?                  | Not now. Plan limits are stored in `features` (JSONB). Usage tracking needs its own ADR.                    |
| OQ6 Refunds?                              | Admin refunds in the Midtrans dashboard, then marks it in the hub (UC-23).                                  |
| Renewals                                  | Manual. The user pays again to renew. "Cancel" means "don't renew" – access stays until the end date.      |

## 5. List of use cases

| ID    | Use case                      | Who                | Backend module            | Priority | Phase |
| ----- | ----------------------------- | ------------------ | ------------------------- | -------- | ----- |
| UC-01 | Read article                  | Visitor            | `content`                 | P0       | 1     |
| UC-02 | View about & products         | Visitor            | `content`, `product`      | P0       | 1     |
| UC-03 | Browse by category / tag      | Visitor            | `content`                 | P1       | 4     |
| UC-04 | Sign in / sign up             | Visitor            | `identity`                | P0       | 2     |
| UC-05 | Manage profile                | SaaS User          | `identity`                | P0       | 2     |
| UC-06 | Buy a subscription            | SaaS User          | `payment`, `subscription` | P0       | 3     |
| UC-07 | Handle payment webhook        | Midtrans           | `payment`, `subscription` | P0       | 3     |
| UC-08 | View my subscriptions         | SaaS User          | `subscription`            | P0       | 3     |
| UC-09 | View my payment history       | SaaS User          | `payment`                 | P0       | 3     |
| UC-10 | Renew subscription            | SaaS User          | `payment`, `subscription` | P1       | 4     |
| UC-11 | Cancel subscription           | SaaS User          | `subscription`            | P1       | 4     |
| UC-12 | Join a connected product      | Connected product  | `identity`                | P0       | 2     |
| UC-13 | Check entitlement             | Connected product  | `subscription`            | P0       | 2–3   |
| UC-14 | Expire subscriptions          | Scheduler          | `subscription`            | P0       | 3     |
| UC-15 | Manage users                  | Admin              | `admin`, `identity`       | P0       | 2     |
| UC-16 | Manage a user's subscriptions | Admin              | `admin`, `subscription`   | P0       | 3     |
| UC-17 | View transactions             | Admin              | `admin`, `payment`        | P0       | 3     |
| UC-18 | Create / edit article         | Admin              | `content`                 | P0       | 1     |
| UC-19 | Publish / unpublish article   | Admin              | `content`                 | P0       | 1     |
| UC-20 | Manage article list           | Admin              | `content`                 | P0       | 1     |
| UC-21 | Manage media library          | Admin              | `media`                   | P0       | 1     |
| UC-22 | Manage categories & tags      | Admin              | `content`                 | P0       | 1     |
| UC-23 | Record refund                 | Admin              | `admin`, `payment`        | P1       | 3     |
| UC-24 | Manage products & plans       | Admin              | `product`                 | P0       | 3     |

Note: UC-23 and UC-24 are not in the PRD yet, but we need them. Add them to PRD v0.3.

## 6. Status rules

These statuses are used by both the API and the database. Do not add other statuses without updating this document.

### 6.1 Transaction (a payment attempt)

| Status     | Meaning                                  | Can change to        |
| ---------- | ---------------------------------------- | -------------------- |
| `PENDING`  | Checkout created, user has not paid yet. | `PAID`, `FAILED`     |
| `PAID`     | Money received.                          | `REFUNDED` only      |
| `FAILED`   | Payment denied, cancelled, or expired.   | nothing (final)      |
| `REFUNDED` | Money returned to the user.              | nothing (final)      |

A transaction **never** goes back to `PENDING`.

How Midtrans status maps to our status:

| Midtrans `transaction_status`                            | Our status |
| -------------------------------------------------------- | ---------- |
| `pending`                                                | `PENDING`  |
| `settlement`, or `capture` with `fraud_status = accept`  | `PAID`     |
| `deny`, `cancel`, `expire`, `failure`                    | `FAILED`   |
| `refund`, `partial_refund`                               | `REFUNDED` |

### 6.2 Subscription (access to a product)

| Status      | Meaning                                                   | How it gets here                                            |
| ----------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| `ACTIVE`    | User has access until `end_date`.                         | Payment is `PAID` (UC-07), admin grant (UC-16), or renewal. |
| `EXPIRED`   | `end_date` passed and the user did not cancel.            | Scheduler (UC-14).                                          |
| `CANCELLED` | `end_date` passed after the user cancelled, or admin cancelled it now. | Scheduler (UC-14) or admin (UC-16).             |

An `EXPIRED` or `CANCELLED` subscription becomes `ACTIVE` again when the user pays (UC-10).

**Important rules:**

- A subscription row is created **only** when payment is confirmed or an admin grants it. There is no "pending subscription".
- One user has **at most one** current subscription per product.
- A user is **entitled** when: `status = ACTIVE` **and** `now < end_date`.
- If the user cancelled but the end date has not passed yet, the status is still `ACTIVE` (with `cancel_at_period_end = true`), and they still have access.

## 7. Rules for every logged-in request

These apply to UC-04 to UC-24:

1. The browser sends the header `Authorization: Bearer <Firebase ID token>`. Spring Security checks it.
2. Invalid or expired token → `401`. The frontend gets a fresh token from Firebase and tries **once** more.
3. User is deactivated (UC-15) → `403` on every endpoint.
4. Endpoints under `/admin/**` need `role = ADMIN` → otherwise `403`.

## 8. Use cases

### 8.1 Public website (Visitor)

#### UC-01 Read article

- **Who:** Visitor (and search engines)
- **Needs:** The article is `PUBLISHED`.
- **When:** Visitor opens `/blog/<slug>`.

**Steps**
1. Vercel returns the cached page.
2. The page shows the title, cover image, body, category, tags, and publish date. The cover image uses CloudFront at 480 / 960 / 1600 px (`srcset`).
3. The page `<head>` has SEO data: title, meta description, canonical URL, Open Graph tags, and `Article` JSON-LD.
4. If the page is not cached yet, Next.js calls `GET /public/articles/{slug}`, builds the page, and caches it.

**If something goes wrong**
- Slug not found or article is a draft → show the `404` page (`notFound()`).
- API is down → Vercel keeps showing the old cached page.

**Result:** Visitor reads the article without logging in. The article is in `sitemap.xml`.

#### UC-02 View about & products

- **Who:** Visitor
- **When:** Visitor opens `/about` or `/products`.

**Steps**
1. `/about` shows Dewa's profile, skills, and portfolio (static page).
2. `/products` calls `GET /public/products` and lists active products with their public plans and prices in IDR.
3. Each product has two buttons: "Learn more" (goes to the product website) and "Get started" (login with UC-04, then buy with UC-06).

#### UC-03 Browse by category / tag

- **Who:** Visitor
- **When:** Visitor opens `/blog/category/<slug>` or `/blog/tag/<slug>`.

**Steps**
1. Show only `PUBLISHED` articles in that category or tag, newest first, with pages (`?page=n`).
2. Each item shows title, excerpt, small cover image (480 px), and publish date.

**If something goes wrong**
- Unknown slug → `404`.
- No articles → show an empty message with a link back to the blog.

### 8.2 Login and profile

#### UC-04 Sign in / sign up

- **Who:** Visitor
- **When:** Visitor clicks "Sign in", or opens a page that needs login (account, checkout).

**Steps**
1. Frontend opens the Firebase login (Google, and email/password if enabled).
2. Firebase gives the browser an ID token.
3. Frontend calls `POST /me/session` with the token.
4. Backend checks the token and looks for the user by Firebase `uid`.
5. If the user does not exist, backend creates it from the token data (`uid`, email, name, picture) with `role = USER` and `status = ACTIVE`.
6. Backend returns the profile and role. Frontend sends the user back to the page they came from, or to `/account`.

**If something goes wrong**
- User closes the popup → stay on the login page, nothing is created.
- Email not verified (email/password login) → `403 EMAIL_NOT_VERIFIED`. Frontend asks the user to verify their email.
- User is deactivated → `403`. Frontend shows "Account disabled, contact support".

**Result:** User is logged in and has exactly one user row in the database.

**Sign out:** Frontend calls Firebase `signOut()`. No backend call is needed – the backend does not keep sessions.

#### UC-05 Manage profile

- **Who:** SaaS User (logged in)
- **When:** User opens `/account/profile`.

**Steps**
1. Frontend calls `GET /me` → name, email, avatar, joined products.
2. User changes their name and/or uploads a new avatar.
3. Frontend sends `PATCH /me` (avatar as multipart). The avatar is resized to 96 and 256 px and saved in S3 under `avatars/<hash>/`.
4. Backend checks the data, saves it, and returns the new profile.

**If something goes wrong**
- Empty or too long name, or bad image → `400` with field errors.
- User wants to change email → they do it in Firebase. On the next login, the backend updates the email from the token.

**Result:** Profile is updated. Connected products see the new data on their next call.

#### UC-12 Join a connected product

- **Who:** Connected product (for example Document Doctor)
- **Needs:** The product is registered in the hub (UC-24) and uses the same Firebase project.
- **When:** A user logs in to Document Doctor for the first time.

**Steps**
1. User logs in inside Document Doctor and gets a Firebase ID token.
2. Document Doctor calls `POST /products/{productCode}/members` with the user's token **and** its own product credential.
3. Hub finds or creates the user (same as UC-04 steps 4–5).
4. Hub saves that this user joined this product (`user_product` table, with join date), if not saved already.
5. Hub returns the user profile and entitlement (UC-13).

**If something goes wrong**
- Unknown or inactive product, or wrong credential → `401` / `403`.
- User already joined → nothing changes, return `200`.

**Result:** The hub knows the user joined the product. Admin can see it in UC-15. Full API details are in ADR-003.

#### UC-13 Check entitlement

- **Who:** Connected product
- **Needs:** User joined the product (UC-12).
- **When:** The product needs to know if the user can use a paid feature.

**Steps**
1. Product calls `GET /products/{productCode}/entitlements/me` with the user's token and its product credential.
2. Hub loads the user's subscription for that product.
3. Hub returns: `entitled` (true/false), plan code, status, `end_date`, and the plan's `features` (limits).

**If something goes wrong**
- No subscription, or not entitled (see §6.2) → `entitled: false`, plus the free plan's features if a free plan exists.

**Rules**
- The product may cache the answer for a short time (about 5 minutes). It must check again after the user comes back from checkout.
- The hub is the only source of truth. Products do not keep their own copy of subscriptions.

### 8.3 Payments and subscriptions

#### UC-06 Buy a subscription

- **Who:** SaaS User (logged in)
- **Needs:** The plan is active and costs more than 0.
- **When:** User clicks "Subscribe" on a plan.

**Steps**
1. Frontend shows a summary (product, plan, period, price in IDR). User confirms.
2. Frontend calls `POST /checkout` with `planId`.
3. Backend checks the plan and the user's current subscription.
4. Backend creates a transaction: unique `order_id`, user, plan, amount, `IDR`, status `PENDING`.
5. Backend calls Midtrans Snap API, saves the Snap token, and returns it to the frontend.
6. Frontend opens the Snap popup. User pays.
7. When the popup closes, frontend shows "Payment processing" and calls `GET /transactions/{orderId}` every few seconds until the status is not `PENDING`. (For VA/QRIS, show the payment instructions.)
8. When UC-07 marks the transaction `PAID`, frontend shows success and a link to `/account/subscriptions`.

**If something goes wrong**
- User already has an active subscription for this product → treat it as a renewal (UC-10). Changing plan in the middle of a period is **not** supported yet.
- User already has a `PENDING` transaction for the same plan that has not expired → return the old Snap token, do not create a new transaction.
- Midtrans API error or timeout → set transaction to `FAILED`, show "Payment could not be started, please try again".
- User closes the popup without paying → transaction stays `PENDING` until Midtrans sends `expire`.
- Payment failed → UC-07 sets `FAILED`. User sees the reason and can try again.

**Result:** ⚠️ Access is given **only** by UC-07 (the webhook). Never trust the browser popup callback or redirect – a user could fake it.

#### UC-07 Handle payment webhook

- **Who:** Midtrans
- **When:** Midtrans calls `POST /webhooks/midtrans`.

**Steps**
1. Check the signature: `signature_key = SHA512(order_id + status_code + gross_amount + server_key)`. This proves the call really came from Midtrans.
2. Call the Midtrans Status API for this `order_id`. Use **that** response as the truth, not the webhook body.
3. Start one database transaction (`@Transactional`) and lock the transaction row (`SELECT ... FOR UPDATE`) so two webhooks cannot update it at the same time.
4. Map the Midtrans status to our status (§6.1). If nothing changed, stop.
5. Check the amount matches what we saved. Then update status, payment method, Midtrans reference, and `paid_at`.
6. If the new status is `PAID`, create or extend the subscription:
   - No subscription yet → create one: `ACTIVE`, `start_date = now`, `end_date = now + period`.
   - Subscription exists → `end_date = max(now, end_date) + period`, status `ACTIVE`, `cancel_at_period_end = false`.
7. Link the subscription to the transaction, commit, return `200`.

**If something goes wrong**
- Bad signature → `403`, log a warning, change nothing.
- Unknown `order_id` → log it and return `200` (so Midtrans stops sending it).
- Status change not allowed (for example `PAID` → `FAILED`) → ignore, log, return `200`.
- Amount does not match → do **not** give access, flag it for admin, return `200`.
- Database error → return `5xx`. Midtrans will send the webhook again later. Steps 3–6 are idempotent, so this is safe.

**Result:** Each status change for an `order_id` is applied exactly once, even if Midtrans sends the webhook many times.

#### UC-08 View my subscriptions

- **Who:** SaaS User
- **When:** User opens `/account/subscriptions`.

**Steps**
1. Frontend calls `GET /me/subscriptions`.
2. For each product, show: product, plan, status, and the renewal or end date.
3. Show buttons based on status:

| Status                                      | Show                    |
| ------------------------------------------- | ----------------------- |
| `ACTIVE`                                    | Renew, Cancel           |
| `ACTIVE` with `cancel_at_period_end = true` | "Ends on <date>", Resume |
| `EXPIRED` or `CANCELLED`                    | Renew / Subscribe       |

**If something goes wrong**
- No subscriptions → empty message with a link to `/products`.

#### UC-09 View my payment history

- **Who:** SaaS User
- **When:** User opens `/account/payments`.

**Steps**
1. Frontend calls `GET /me/transactions?page=n`.
2. Show a list, newest first: date, product, plan, amount (IDR), payment method, status.
3. For a `PENDING` transaction, the user can open the payment instructions again (until it expires).

**Rule:** A user only sees **their own** transactions. Always filter by the user from the token, never by a user id sent in the request.

#### UC-10 Renew subscription

- **Who:** SaaS User
- **Needs:** User has a subscription for the product (any status).
- **When:** User clicks "Renew" (UC-08) or a link in a reminder email.

**Steps**
1. Frontend starts UC-06 with the same plan.
2. After payment, UC-07 sets `end_date = max(now, end_date) + period`. So renewing early never loses paid days.

**If something goes wrong**
- The old plan is not sold anymore → user picks another active plan of the same product.

**Result:** Subscription is `ACTIVE` with a later end date.

#### UC-11 Cancel subscription

- **Who:** SaaS User
- **Needs:** Subscription is `ACTIVE`.
- **When:** User clicks "Cancel" and confirms.

**Steps**
1. Frontend calls `POST /me/subscriptions/{id}/cancel`.
2. Backend sets `cancel_at_period_end = true` and saves the time. Status stays `ACTIVE`.
3. Stop sending renewal reminder emails for this subscription.
4. Page shows "Ends on <end_date>".

**Undo:** `POST /me/subscriptions/{id}/resume` sets `cancel_at_period_end = false`.

**Result:** User keeps access until `end_date`. Then UC-14 sets it to `CANCELLED`. No refund (refunds only through UC-23).

#### UC-14 Expire subscriptions

- **Who:** Scheduler
- **When:** Every hour (for example).

**Steps**
1. Find `ACTIVE` subscriptions where `end_date <= now`.
2. If `cancel_at_period_end = true` → set `CANCELLED`. Otherwise → set `EXPIRED`.
3. Find `ACTIVE` subscriptions that end in 7 days or 1 day (and are not cancelled). Send a renewal reminder email. Save that the email was sent so it is not sent twice. (Email provider: ADR-005.)

**Rules**
- UC-13 checks `end_date` itself. So if this job runs late, nobody gets extra free access.
- The job must be safe to run twice. Only update rows that still have the expected status.

### 8.4 Admin

#### UC-15 Manage users

- **Who:** Admin
- **When:** Admin opens `/admin/users`.

**Steps**
1. Search by name or email. The list shows name, email, status, joined products, and created date (with pages).
2. Open a user to see profile, joined products, subscriptions, and transactions.
3. **Deactivate:** backend sets `status = INACTIVE` and disables the user in Firebase (Firebase Admin SDK). All API calls from this user now return `403`.
4. **Reactivate:** the opposite of step 3.

**If something goes wrong**
- Firebase call fails → roll back the database change and show an error.
- Admin tries to deactivate themself → not allowed.

**Result:** Every change is saved in the audit log.

#### UC-16 Manage a user's subscriptions

- **Who:** Admin
- **When:** Admin opens a user's subscriptions (from UC-15).

**Steps**
1. Admin sees all subscriptions of the user and their transactions.
2. Admin picks one action and **must** write a reason:
   - **Grant** – create an `ACTIVE` subscription with an end date (no payment needed).
   - **Extend** – move `end_date` later.
   - **Cancel now** – set `CANCELLED` and `end_date = now`.
3. Backend saves the change and writes an audit record: admin, user, subscription, action, old value, new value, reason, time.

**If something goes wrong**
- Grant, but the user already has a current subscription → tell the admin to use Extend.

**Result:** The change shows immediately in UC-08 and UC-13.

#### UC-17 View transactions

- **Who:** Admin
- **When:** Admin opens `/admin/transactions`.

**Steps**
1. Filter by user, product, status, and date. List is paged, newest first.
2. Show totals for the filter: number of transactions and total `PAID` amount (IDR).
3. Open one to see `order_id`, Midtrans reference, amount, method, status history, and linked subscription.

**Extra:** If a status looks wrong, admin clicks "Sync with Midtrans". Backend calls the Midtrans Status API and runs UC-07 steps 3–7.

#### UC-18 Create / edit article

- **Who:** Admin
- **When:** Admin clicks "New article" or opens an article.

**Steps**
1. Admin writes the article in the editor (Markdown).
2. Admin fills: title, slug (auto from title, can edit), excerpt, cover image (from UC-21), one category, tags, meta title, meta description.
3. Admin can insert images from the media library into the body.
4. Admin saves. A new article is saved as `DRAFT`.
5. If the article is already `PUBLISHED`, saving also rebuilds the public pages (UC-19 step 3).

**If something goes wrong**
- Slug already used → `409`, admin picks another.
- Required fields missing → `400` with field errors.
- Slug of a published article changes → keep the old slug and redirect it (`301`) to the new one, so old links still work.

**Result:** The article is saved. The public site only changes if the article is published.

#### UC-19 Publish / unpublish article

- **Who:** Admin
- **Needs:** Title, slug, excerpt, and category are filled.
- **When:** Admin clicks "Publish" or "Unpublish".

**Steps**
1. Backend sets status to `PUBLISHED` (and saves `published_at` the first time), or back to `DRAFT`.
2. Backend commits to the database.
3. Backend calls the Next.js revalidate endpoint (protected by a secret) for: the article page, blog list, its category and tag pages, and `sitemap.xml`.
4. The public site shows (or hides) the article on the next request.

**If something goes wrong**
- Revalidate call fails → the change stays saved. Backend retries a few times and the admin sees a warning. Pages still refresh later by ISR time-based revalidation.

**Result:** Only published articles are public and in the sitemap.

#### UC-20 Manage article list

- **Who:** Admin
- **When:** Admin opens `/admin/articles`.

**Steps**
1. Search by title. Filter by status, category, and tag. List is paged.
2. Admin can open (UC-18), publish/unpublish (UC-19), or delete an article.
3. Delete asks for confirmation. If the article is published, unpublish and revalidate it first, then delete.

#### UC-21 Manage media library

- **Who:** Admin
- **When:** Admin opens `/admin/media`, or picks an image in the editor.

**Steps**
1. Admin uploads an image (JPEG, PNG, or WebP, max 10 MB) and writes alt text.
2. Backend checks type and size, fixes rotation (EXIF), removes metadata, and makes WebP copies at 480, 960, and 1600 px (Scrimage, limited thread pool).
3. Backend uploads them to S3 as `images/<content-hash>/<width>.webp` and saves an image record (keys, width, height, alt text).
4. The library shows thumbnails. Admin can search, copy the CloudFront URL, or insert the image into an article.
5. Admin can delete an image that is not used.

**If something goes wrong**
- Wrong type or too big → rejected (by Nginx or the API) with a clear message.
- Same image uploaded again (same hash) → reuse the old record, don't upload again.
- Image is used by an article → can't delete; show which articles use it.

#### UC-22 Manage categories & tags

- **Who:** Admin
- **When:** Admin opens `/admin/categories` or `/admin/tags`.

**Steps**
1. Create a category or tag (name; slug is auto, can edit).
2. Rename one → published pages using it are revalidated.
3. Delete one.

**If something goes wrong**
- Name or slug already exists → `409`.
- Category still has articles → can't delete. Move the articles to another category first (every article needs one category).
- Deleting a tag removes it from all articles (after confirmation).

#### UC-23 Record refund

- **Who:** Admin
- **Needs:** Transaction is `PAID`, and the money was already refunded in the Midtrans dashboard.
- **When:** Admin clicks "Record refund" on a transaction (UC-17).

**Steps**
1. Admin writes a reason and chooses whether to end the subscription now.
2. Backend sets the transaction to `REFUNDED`. If chosen, it cancels the subscription (same as UC-16 "Cancel now").
3. Backend writes an audit record.

**Note:** If Midtrans already sent a `refund` webhook, the transaction is already `REFUNDED`. The admin only decides about the subscription.

#### UC-24 Manage products & plans

- **Who:** Admin
- **When:** Admin opens `/admin/products`.

**Steps**
1. Create a product: code (for example `document-doctor`), name, description, website URL, active flag. Backend creates a product credential (used in UC-12 and UC-13) and shows it **only once**.
2. Add plans: code, name, price (IDR), period (monthly / yearly), `features` (JSONB limits), public flag, active flag.
3. Deactivate a plan to stop new sales.

**Rules**
- Never delete or change the price of a plan that was already sold. Make a new plan instead, so old transactions still make sense.
- Adding a new product needs only these steps – no database schema change.

## 9. PRD to use case mapping

| PRD item | Use case(s)          | PRD item | Use case(s)         |
| -------- | -------------------- | -------- | ------------------- |
| V-1.1    | UC-01                | A-3.1    | UC-15               |
| V-1.2    | UC-02                | A-3.2    | UC-16               |
| V-1.3    | UC-03                | A-3.3    | UC-17               |
| U-2.1    | UC-05                | A-3.4    | UC-18               |
| U-2.2    | UC-06, UC-07         | A-3.5    | UC-18               |
| U-2.3    | UC-09                | A-3.6    | UC-19               |
| U-2.4    | UC-08                | A-3.7    | UC-20               |
| U-2.5    | UC-10, UC-11         | A-3.8    | UC-21               |
| FR-U1    | UC-04, UC-12         | A-3.9    | UC-22               |
| FR-U2    | UC-13                | FR-S1    | UC-24               |
| FR-U3    | UC-12, UC-15         | FR-S2    | UC-07, UC-16        |
| FR-U4    | UC-04, §7            | FR-S3    | UC-07, UC-11, UC-14 |
| FR-C1    | UC-01                | FR-P1    | UC-06               |
| FR-C2    | UC-19                | FR-P2    | UC-07               |
| FR-C3    | UC-18, UC-22         | FR-P3    | UC-06, UC-07, UC-17 |
| FR-C4    | UC-21                | FR-C5    | UC-01, UC-19        |

## 10. Pros, cons, and next steps

**Good**
- Every PRD story has at least one use case, so nothing is forgotten.
- Access has one simple rule: `ACTIVE` and `now < end_date`. Only UC-07 (payment) or UC-16 (admin) can give access.
- Error cases are decided before coding.

**Risks**

| Risk                                                                  | What we do                                                              |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Users can't change plan in the middle of a period.                    | Admin handles special cases with UC-16. Add proration later if needed.  |
| Manual renewal needs reminder emails, which need an email provider.   | ADR-005 picks the provider before Phase 3 goes live.                    |
| Products cache entitlement, so access can be a few minutes out of date. | Short cache time; re-check after checkout; details in ADR-003.        |
| UC-23 and UC-24 are not in the PRD.                                   | Add them to PRD v0.3.                                                   |

**Next steps**
- ADR-001 planned "ADR-002: Vercel Pro vs. self-hosted Next.js". That topic needs a new number, because ADR-002 is now this document.
- ADR-003: API details for UC-12 and UC-13 (endpoints, product credentials, response format, caching).
- ADR-004 (automatic recurring payments), if added, will change UC-10 and UC-11.
- ADR-005 (email provider) is needed for UC-14 reminders.
