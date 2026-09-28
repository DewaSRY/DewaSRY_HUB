# Dewa Surya Hub — Product Requirements Document

| Field   | Value              |
| ------- | ------------------ |
| Author  | Dewa Surya Ariesta |
| Date    | 28 September 2026  |
| Status  | Draft              |
| Version | 0.2                |

---

## 1. Overview

Dewa Surya Hub is the central platform for Dewa's SaaS ecosystem. It combines four capabilities in a single application:

1. **Content publishing:** blogs, articles, and tutorials that bring in visitors.
2. **Centralized user hub:** one identity and one view of every user across Dewa's SaaS products.
3. **SaaS & subscription management:** which users have which products, on which plan.
4. **Payment portal:** purchases, renewals, and transaction history through a payment gateway.

The first connected SaaS product is **Document Doctor**. The platform must be designed so additional products can be added later without re-architecting.

## 2. Problem Statement

Dewa needs to build awareness of Dewa's products, publish content, and manage users across multiple SaaS applications. Today these responsibilities are spread across separate applications, which leads to:

- An inconsistent user experience between products.
- No single view of a user's accounts, subscriptions, and payments.
- Duplicated effort to build auth, billing, and admin tooling in each product.

## 3. Goals & Non-Goals

### 3.1 Goals

| #  | Goal                                                                                  |
| -- | ------------------------------------------------------------------------------------- |
| G1 | Attract visitors through search engines with a well-performing blog and portfolio.    |
| G2 | Provide a single account and profile shared across all Dewa SaaS products.            |
| G3 | Let users buy, renew, and manage subscriptions for SaaS products in one place.        |
| G4 | Give the administrator one dashboard for users, subscriptions, payments, and content. |
| G5 | Make it straightforward to connect a new SaaS product to the hub.                     |

### 3.2 Non-Goals (for the first release)

- Multi-author or team content editing (a single administrator only).
- Visitor comments, community, or forum features.
- Building the SaaS products themselves (e.g. Document Doctor features live in their own app).
- Multiple payment gateways (one gateway at launch).

## 4. Target Users (Personas)

### 4.1 Visitor

People who find the blog, articles, or products but have not created an account.

- Read blog articles and tutorials.
- Learn about Dewa as a full-stack developer and about Dewa's services and products.

### 4.2 SaaS User

Registered users of one or more Dewa SaaS products, such as Document Doctor.

- Manage their profile.
- View and manage their subscription.
- Purchase or renew a plan.
- View their payment history.

### 4.3 Administrator

The platform owner and operator (Dewa).

- Manage users and their subscriptions.
- View payments and transactions.
- Create, edit, and publish articles.
- Manage image assets.
- Manage categories and tags.

## 5. User Stories

Priority: **P0** = required for launch, **P1** = soon after launch, **P2** = later.

### 5.1 Visitor

| ID    | User story                                                                                                           | Priority | Acceptance criteria                                                                                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V-1.1 | As a visitor, I want to find and read articles from search engine results so I can learn about a topic.              | P0       | Published articles are publicly accessible without login; each has a unique, readable URL (slug), title, meta description, and Open Graph tags; a sitemap and `robots.txt` exist. |
| V-1.2 | As a visitor, I want to learn who Dewa is and what products Dewa offers so I can decide whether to try them.          | P0       | An About/portfolio page describes Dewa as a full-stack developer; a Products section lists Document Doctor with a link to sign up or learn more.                                  |
| V-1.3 | As a visitor, I want to browse articles by category or tag so I can find related content.                            | P1       | Category and tag listing pages show only published articles, with pagination.                                                                                                     |

### 5.2 SaaS User

| ID    | User story                                                                                          | Priority | Acceptance criteria                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| U-2.1 | As a registered user, I want to view and edit my profile so my information stays correct.          | P0       | The user can view and update name, email, and avatar; the profile is shared across all connected SaaS products.                                 |
| U-2.2 | As a registered user, I want to purchase a subscription plan so I can use a SaaS product.           | P0       | The user can pick a product and plan, pay through the payment gateway, and receive access once payment succeeds; failed payments grant no access. |
| U-2.3 | As a registered user, I want to see my purchase history so I can track what I have paid.           | P0       | A list shows each transaction's date, product, plan, amount, and status (pending, paid, failed, refunded).                                      |
| U-2.4 | As a registered user, I want to see my current subscription status so I know what I have access to. | P0       | For each product, the user sees plan name, status (active, expired, cancelled), and renewal or expiry date.                                    |
| U-2.5 | As a registered user, I want to renew or cancel my subscription so I stay in control of billing.    | P1       | The user can renew before or after expiry and cancel auto-renewal; the change shows immediately in subscription status.                         |

### 5.3 Administrator

| ID    | User story                                                                                          | Priority | Acceptance criteria                                                                                                                  |
| ----- | --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A-3.1 | As an admin, I want to manage users of the SaaS products so I can support and moderate accounts.    | P0       | The admin can search, view, and deactivate/reactivate users and see which products each user is connected to.                        |
| A-3.2 | As an admin, I want to manage user subscriptions so I can resolve billing and access issues.        | P0       | The admin can view, grant, extend, and cancel a user's subscription; every manual change is recorded with a timestamp.               |
| A-3.3 | As an admin, I want to see payment history so I can monitor revenue and investigate problems.       | P0       | The admin can list and filter all transactions by user, product, status, and date range.                                             |
| A-3.4 | As an admin, I want to create articles so I can publish new content.                                | P0       | The admin can write an article in a rich-text or Markdown editor with title, slug, excerpt, cover image, category, tags, and SEO fields. |
| A-3.5 | As an admin, I want to edit articles so I can keep content accurate.                                | P0       | The admin can edit drafts and published articles; saving a published article updates the public page.                                |
| A-3.6 | As an admin, I want to publish and unpublish articles so I control what is public.                  | P0       | Articles have Draft and Published states; only Published articles appear publicly; the publish date is recorded.                      |
| A-3.7 | As an admin, I want to manage all articles so I can keep the blog organized.                        | P0       | The admin can list, search, filter by status/category/tag, and delete articles.                                                       |
| A-3.8 | As an admin, I want to manage image assets so I can reuse images across articles.                   | P0       | The admin can upload, browse, and delete images in a media library and insert them into articles.                                     |
| A-3.9 | As an admin, I want to manage categories and tags so content stays well organized.                  | P0       | The admin can create, rename, and delete categories and tags; an article has one category and many tags.                             |

## 6. Functional Requirements

### 6.1 Content & Blog

- FR-C1: Public article pages are server-rendered (or statically generated) for SEO.
- FR-C2: Articles support Draft and Published states.
- FR-C3: Articles belong to one category and may have many tags.
- FR-C4: A media library stores images used by articles.
- FR-C5: A sitemap updates automatically when articles are published or unpublished.

### 6.2 Identity & User Hub

- FR-U1: A single account (email/password and/or OAuth) works across all connected SaaS products (SSO).
- FR-U2: Connected SaaS apps authenticate users through the hub and can check a user's subscription or entitlement.
- FR-U3: The hub records which SaaS products each user has joined.
- FR-U4: Role-based access separates SaaS users from administrators.

### 6.3 Subscriptions

- FR-S1: Each SaaS product defines one or more plans (name, price, billing period, features/limits).
- FR-S2: A subscription links a user, a product, and a plan, with a status and start/end dates.
- FR-S3: Subscription status updates automatically on payment success, failure, expiry, and cancellation.

### 6.4 Payments

- FR-P1: Integrate with one payment gateway for checkout (gateway to be decided, see Open Questions).
- FR-P2: Handle gateway webhooks to confirm payment status; access is granted only after confirmed payment.
- FR-P3: Store each transaction with amount, currency, status, gateway reference, and timestamps.

## 7. Non-Functional Requirements

| Area          | Requirement                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| SEO           | Public pages score ≥ 90 on Lighthouse SEO; semantic HTML, meta tags, and structured data for articles.       |
| Performance   | Public pages reach Largest Contentful Paint < 2.5 s on a typical mobile connection.                          |
| Security      | HTTPS everywhere; passwords hashed; no card data stored on the platform; webhook signatures verified.        |
| Privacy       | Users can view and update their personal data; data handling follows applicable privacy regulations.        |
| Reliability   | Payment webhooks are idempotent and retry-safe.                                                              |
| Extensibility | Adding a new SaaS product requires configuration (product, plans, client credentials), not schema changes.   |
| Responsive    | All pages work on mobile, tablet, and desktop.                                                               |

## 8. Success Metrics

| Goal | Metric                                                                  |
| ---- | ----------------------------------------------------------------------- |
| G1   | Monthly organic visitors; number of articles ranking on page 1 of search. |
| G2   | Share of SaaS users signing in through the hub account.                 |
| G3   | Visitor → registered user → paid subscriber conversion rates.           |
| G3   | Payment success rate; subscription renewal rate.                        |
| G4   | Time for the admin to resolve a user or billing issue.                  |

Targets are to be set after the first month of baseline data.

## 9. Release Plan

| Phase | Scope                                                                                     |
| ----- | ----------------------------------------------------------------------------------------- |
| 1     | Public site: blog, about/portfolio, products page; admin content management (CMS).       |
| 2     | Hub accounts and SSO; user profile; Document Doctor connected to the hub.                 |
| 3     | Plans, subscriptions, payment gateway checkout, purchase history; admin billing views.    |
| 4     | Renewal/cancellation self-service; category/tag browsing; onboarding of additional SaaS products. |

## 10. Open Questions

1. Which payment gateway will be used (e.g. Stripe, Midtrans, Xendit), and which currencies must be supported?
2. What SSO approach will connected SaaS products use (OAuth 2.0 / OpenID Connect, shared JWT, other)?
3. What plans and pricing will Document Doctor offer, and are there free tiers or trials?
4. Should users be able to sign up directly on the hub, or only through a SaaS product?
5. Does "usage" information (from the original purpose statement) need to be shown for each plan, and how is it reported by each SaaS product?
6. Are refunds handled in the platform or manually through the gateway dashboard?

## 11. Glossary

| Term             | Definition                                                                 |
| ---------------- | -------------------------------------------------------------------------- |
| Hub              | Dewa Surya Hub, this platform.                                             |
| SaaS product     | A separate Dewa application connected to the hub (e.g. Document Doctor).   |
| Plan             | A priced offering of a SaaS product (e.g. Monthly Pro).                    |
| Subscription     | A user's active or past enrollment in a plan.                              |
| Entitlement      | What a user is allowed to access, based on their subscriptions.            |
