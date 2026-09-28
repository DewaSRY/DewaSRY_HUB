# Dewa Surya hub

| Author | Dewa Surya Ariesta |
| ------ | ------------------ |
| Date   | 28 September 2026  |
| Status | Draft              |

## **1. Overview**

Dewa Surya Hub is the central platform for Dewa's SaaS ecosystem. It combines four capabilities in a single application:

1. **Content publisher:** blogs, articles, and tutorials that bring in visitors
2. **Centralized user hub:** one identity and one view of every user across Dewa's SaaS products.
3. **SaaS & subscription management:** Which user have which products on which plan \*\*\*\*
4. **Payment Portal:** Purchases renewals and transaction history through a payment gateway

The first connected SaaS Product is **Doctor Document** the the platform must be design so additional products can added leter without re-architecting

## 2. Problem Statement

Dewa needs to build awareness of Dewa and Dewa’s products, publish content, and manage users across multiple SaaS application. The system to orchestrate all of services need to structure to achieve:

1. Integrate users with other software
2. Centralize view of user and the payment history
3. Centralize the module for, auth, billing and other tooling

## 3.Goals And Non-Goals

### 3.1 Goals:

| #   | Goals                                                                                 |
| --- | ------------------------------------------------------------------------------------- |
| G1  | Attract visitor through search engines with a well-performing blog and portfolio.     |
| G2  | Provide a single account and profile shared across all Dewa SaaS products.            |
| G3  | Make it straightforward to connect a new SaaS product to the hub.                     |
| G4  | Give the administrator one dashboard for users, subscriptions, payments, and content. |
| G5  | Let users i can buy with one time payment or qr-code                                  |

### 3.2 NOT A GOALS

- Build a multi author content (current post content is admin only)
- Visitor commend and react (it’s might be will added letter)
- Tools services builder
- Multi Payment gateway (for now the payment will done by middtrans)

## 4.Target Users

4.1 Visitor : People find the post, article and product but not use the product yet.

- Read blog, article, post and tutorial
- Learn more about Dewa as full stack developer and about Dewa services products

  4.2 SaaS User: User pay for Dewa Services and products

- Manage they profile
- View and manage their subscription
- Purchase services or product by qrcode payment or one time payment
- Manage they purchase history

  4.3 Admin: Platform owner (Dewa)

- View User, and they transaction summary,
- View Payment history.
- Manage Image asset
- Manage Post Content asset
- Manage Category And tag (Need Research about next js async Metadata)

## 5.User Story

Priority: P0 = Required for launch, P1 = Soon After launch, P2 = Letter

5.1 Visitor User Story = V

| ID    | User Story                                                                                                   | **Acceptance Criteria**                                                                                                                                                           | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| V-1.1 | As a Visitor, I want to find and read articles from search engine results, so i can learn about the topic    | Published articles are publicly accessible without login; each has a unique, readable URL (slug), title, meta description, and Open Graph tags; a sitemap and `robots.txt` exist. | P0       |
| V-1.2 | As a visitor, I want to learn who Dewa is and what products Dewa offers so I can decide whether to try them. | An About/portfolio page describes Dewa as a full-stack developer; a Products section lists Document Doctor with a link to sign up or learn more.                                  | P0       |
| V-1.3 | As a visitor, I want to browse articles by category or tag so I can find related content.                    | Category and tag listing pages show only published articles, with pagination.                                                                                                     | P1       |

5.2 SaaS User Story = SU

| ID     | User Story                                                                                           | **Acceptance Criteria**                                                                                                                           | Priority |
| ------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| US-2.1 | As a SaaS User, i want to see my profile, So i can review my information on the application.         | User can see they Profile, the profile will base on they Google account profile                                                                   | P0       |
| US-2.2 | As SaaS User, i want to purchase services and subscription, So i can can use the plan on my services | The user can pick a product and plan, pay through the payment gateway, and receive access once payment succeeds; failed payments grant no access. | P0       |
| US-2.3 | As a Saas user, I want to see my purchase history so I can track what I have paid.                   | A list shows each transaction's date, product, plan, amount, and status (pending, paid, failed, refunded).                                        | P0       |
| US-2.4 | As a SaaS user, I want to see my current subscription status so I know what I have access to.        | For each product, the user sees plan name, status (active, expired, cancelled), and renewal or expiry date.                                       | P0       |

5.3 Administrator

| ID    | User Story                                                                                    | **Acceptance Criteria**                                                                                                                            | Priority |
| ----- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| A-3.1 | As Admin, i want to see user profile, so i can know about who and why user use my application | The admin have table of user use services                                                                                                          | P0       |
| A-3.2 | As an admin, I want to see payment history so I can monitor revenue and investigate problems. | The admin can list and filter all transactions by user, product, status, and date range.                                                           | P0       |
| A-3.3 | As an admin, I want to create articles so I can publish new content.                          | The admin can write an article in a rich-text or Markdown editor with title, slug, excerpt, cover image, category, tags, SEO fields, and meta data | P0       |
| A-3.4 | As an admin, I want to edit articles so I can keep content accurate.                          | The admin can edit drafts and published articles; saving a published article updates the public page.                                              | P0       |
| A-36  | As an admin, I want to publish and unpublish articles so I control what is public.            | Articles have Draft and Published states; only Published articles appear publicly; the publish date is recorded.                                   | P0       |
| A-37  | As an admin, I want to manage image assets so I can reuse images across articles.             | The admin can upload, browse, and delete images in a media library and insert them into articles.                                                  | P0       |
| A-38  | As an admin, I want to manage categories and tags so content stays well organized.            | The admin can create, rename, and delete categories and tags; an article has one category and many tags.                                           | P0       |

### **6. Functional Requirements**

### **6.1 Content & Blog**

| ID    | Functional                                                                  |
| ----- | --------------------------------------------------------------------------- |
| FR-C1 | Public article pages are server-rendered (or statically generated) for SEO. |
| FR-C2 | Articles support Draft and Published states.                                |
| FR-C3 | Articles belong to one category and may have many tags.                     |
| FR-C4 | A media library stores images used by articles.                             |
| FR-C5 | A sitemap updates automatically when articles are published or unpublished. |

### **6.2 Identity & User Hub**

| ID    | Functional                                                                                                 |
| ----- | ---------------------------------------------------------------------------------------------------------- |
| FR-U1 | A single account OAuth works across all connected SaaS products (SSO).                                     |
| FR-U2 | Connected SaaS apps authenticate users through the hub and can check a user's subscription or entitlement. |
| FR-U3 | The hub records which SaaS products each user has joined.                                                  |
| FR-U4 | Role-based access separates SaaS users from administrators.                                                |

### 6.3 **Payments**

| ID    | Functional                                                                                         |
| ----- | -------------------------------------------------------------------------------------------------- |
| FR-P1 | Integrate with one payment gateway for checkout (gateway to be decided, see Open Questions).       |
| FR-P2 | Handle gateway webhooks to confirm payment status; access is granted only after confirmed payment. |
| FR-P3 | Store each transaction with amount, currency, status, gateway reference, and timestamps.           |

## **7. Non-Functional Requirements**

| SEO           | Public pages score ≥ 90 on Lighthouse SEO; semantic HTML, meta tags, and structured data for articles.             |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Performance   | Public pages reach Largest Contentful Paint < 2.5 s on a typical mobile connection.                                |
| Security      | HTTPS everywhere; Integrate with social sign in; no card data stored on the platform; webhook signatures verified. |
| Reliability   | Payment webhooks are idempotent and retry-safe.                                                                    |
| Extensibility | Adding a new SaaS product requires configuration (product, plans, client credentials), not schema changes.         |
| Responsive    | All pages work on mobile, tablet, and desktop.                                                                     |

## **8. Success Metrics**

| Goals | Matrics                                                                   |
| ----- | ------------------------------------------------------------------------- |
| G1    | Monthly organic visitors; number of articles ranking on page 1 of search. |
| G2    | Share of SaaS users signing in through the hub account.                   |
| G3    | Visitor → registered user → paid subscriber conversion rates.             |
| G4    | Payment success rate; subscription renewal rate.                          |

## **9. Release Plan**

| Phase | Scope                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------- |
| P1    | Public site: blog, about/portfolio, products page; admin content management (CMS).                |
| P2    | Hub accounts and SSO; user profile; Document Doctor connected to the hub.                         |
| P3    | Plans, subscriptions, payment gateway checkout, purchase history; admin billing views.            |
| P4    | Renewal/cancellation self-service; category/tag browsing; onboarding of additional SaaS products. |

## **10. Open Questions**

| No  | Question                                                                                                                                    | Answer                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Which payment gateway will be used (e.g. Stripe, Midtrans, Xendit), and which currencies must be supported?                                 | Midtrans for initial                          |
| 2   | What SSO approach will connected SaaS products use (OAuth 2.0 / OpenID Connect, shared JWT, other)?                                         | OAuth 2.0 with firebase                       |
| 3   | What plans and pricing will Document Doctor offer, and are there free tiers or trials?                                                      | For now, payment plan will remove the ads     |
| 4   | Should users be able to sign up directly on the hub, or only through a SaaS product?                                                        | User can sing both on SasS app and on the hub |
| 5   | Does "usage" information (from the original purpose statement) need to be shown for each plan, and how is it reported by each SaaS product? | It’s should be, but it will do letter         |
| 6   | Are refunds handled in the platform or manually through the gateway dashboard?                                                              | No                                            |

## **11. Glossary**

| Term         | Definition                                                               |
| ------------ | ------------------------------------------------------------------------ |
| Hub          | Dewa Surya Hub, this platform.                                           |
| SaaS product | A separate Dewa application connected to the hub (e.g. Document Doctor). |
| Plan         | A priced offering of a SaaS product (e.g. Monthly Pro).                  |
| Subscription | A user's active or past enrollment in a plan.                            |
| Entitlement  | What a user is allowed to access, based on their subscriptions.          |

Need to cover letter,

- User interaction with post; Up, Down, Comment, Tag other user.
- Giving feedback about the application and system
- Share the post to social media
- Tools to Make Quotation and tract freelance flow in dewa hub. Dewa will provide ser
