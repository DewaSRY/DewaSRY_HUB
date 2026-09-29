# ADR-005: Ads Provider, Placement, and Consent

| Author   | Dewa Surya Ariesta                                                                                                                                                                                                                     |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date     | 29 September 2026                                                                                                                                                                                                                      |
| Status   | Proposed                                                                                                                                                                                                                               |
| Deciders | Dewa Surya Ariesta                                                                                                                                                                                                                     |
| Related  | [PRD](../PRD.md), [ADR-001](./ADR-001-initial_technology.md), [ADR-002](./ADR-002-usecase.md), [ADR-003](./ADR-003-api-contract.md), [ADR-004](./ADR-004-initial_schema_model.md), [ADR-008](./ADR-008-portal_structure.md), [ADR-009](./ADR-009-article_authoring_and_display.md) |

## 1. Overview

The hub has no revenue at launch. Ads on the public pages are the first income (ADR-001 D9), and "no ads" is the only paid feature of Document Doctor (PRD OQ3, ADR-004 `features.removeAds`).

Earlier ADRs already fixed parts of this and left the rest to ADR-005:

| Already decided                                                                                              | Where                     |
| ------------------------------------------------------------------------------------------------------------ | ------------------------- |
| Host allows ads on the cheapest plan (Cloudflare Workers).                                                    | ADR-001 §5.2              |
| Ads rules: `ads.txt`, script after interactive, reserved slot space, only on public content pages, CSP, consent banner "if needed". | ADR-001 §5.2 "Ads rules" |
| Only `(site)` mounts the ad script and `<AdSlot>`; ESLint rule I6.                                             | ADR-008 §4.2, §5.2        |
| In-article slot positions (`in-article-1..3`, `sidebar`, `end-of-article`).                                   | ADR-009 §7.5              |
| **Left open:** the ad network, the consent banner, the Content Security Policy, and how products use `removeAds`. | ADR-008 §12, ADR-009 §12 |

The code in `apps/portal/components/ads/` already has an AdSense-style loader and slot, driven by `NEXT_PUBLIC_AD_*` env vars. This ADR confirms that choice and closes the open items.

### 1.1 What the code does today

| Item                                     | State                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `components/ads/ad-script.tsx`           | Loads `pagead2.googlesyndication.com/.../adsbygoogle.js` with `lazyOnload`. Nothing without `NEXT_PUBLIC_AD_CLIENT`. |
| `components/ads/ad-slot.tsx`             | `<ins class="adsbygoogle">` in an `<aside>` with a fixed `min-height`; grey placeholder mode.           |
| `components/ads/config.ts`               | Slot kinds `in-article` (280 px), `sidebar` (600 px, desktop only), `end-of-article` (280 px), `list` (250 px). |
| Slots used in                            | `/blog`, category and tag lists (`list` after 6 cards), `/blog/[slug]` (in-article, sidebar, end), `/products`, `/products/[productCode]`. |
| `public/ads.txt`                         | Placeholder comment only.                                                                              |
| Consent banner                           | **None.**                                                                                              |
| Content Security Policy                  | **None.** `next.config.ts` sets only `nosniff`, `Referrer-Policy`, `X-Frame-Options`.                   |
| Privacy policy page                      | **None.**                                                                                              |
| Site → portal links                      | `SiteNav` and `SiteFooter` use the client `<Link>` to `/login`, `/account`, `/account/*`. **The ad script stays loaded after this soft navigation**, so it runs inside the portal. This breaks D5 of ADR-008. |

## 2. Decision Drivers

| #   | Driver                                                                                                                                           | Source                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| D1  | US$0 fixed cost. No minimum traffic to join, because traffic starts at zero.                                                                      | ADR-001 D1                      |
| D2  | Ads must not hurt SEO: LCP < 2.5 s, CLS < 0.1 on public pages.                                                                                    | PRD G1, NFR Performance; ADR-001 D2 |
| D3  | Visitors come from Indonesia, SEA, and Europe. Serving personalised ads to EEA/UK visitors needs consent through a Google-certified CMP (IAB TCF v2.2). | ADR-001 §1                      |
| D4  | Ads only on public content pages. Never in `(auth)`, `sso`, `(portal)`, `(admin)`, or checkout — also not after a client-side navigation.          | ADR-001 §5.2; ADR-008 D5, I6    |
| D5  | Public pages are static / ISR. Nothing in the ad or consent setup may need per-request rendering.                                                 | ADR-008 D2                      |
| D6  | The Firebase ID token lives in the browser (ADR-008 D3). Third-party scripts near it must be as few as possible.                                   | ADR-008 §11 risk table          |
| D7  | One developer: no ad server, no header bidding, no CMP to host.                                                                                   | ADR-001 §1                      |

## 3. Decision Summary

| #   | Decision                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Google AdSense** is the ad network, with **manual ad units only** (Auto ads off) (§4).                                                                                          |
| S2  | Consent is handled by **Google Privacy & messaging** (Google's free, TCF-certified CMP), served through the existing AdSense tag. No self-built banner (§6).                       |
| S3  | Ads appear on blog lists, articles, and `/products`. **Removed from `/products/[productCode]`** (the sales page) and never on home, about, privacy, or any non-`(site)` route (§5). |
| S4  | Every link from `(site)` to `(auth)`, `sso`, `(portal)`, `(admin)`, or checkout is a **full page load**, so the ad script is never in memory there (§7).                         |
| S5  | A static **CSP**: report-only allowlist on `(site)`; strict, enforced policy without ad domains on the other routes (§8).                                                         |
| S6  | New public **`/privacy`** page and a **"Privacy choices"** link in the site footer (§6.3).                                                                                         |
| S7  | The hub site shows the same ads to every visitor. `removeAds` is a **product** feature; a product with `removeAds: true` does **not load** its ad script at all (§9).             |

## 4. Ad Network: Google AdSense

**Decision.** Use Google AdSense with responsive display units placed by the code. One AdSense account (publisher ID `pub-…`) covers the hub and later products; each domain is added as a site in AdSense.

**Rationale.**

- No minimum traffic, no fee, pays to an Indonesian bank account. Works from the first approved article (D1).
- The code already targets it (`adsbygoogle.js`, `data-ad-client`, `data-ad-slot`).
- It comes with a free certified CMP (S2), so D3 needs no extra vendor.
- Only one third-party script family on the page (D6, D7).

**AdSense console settings.**

| Setting                    | Value                                                                                                              | Why                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Auto ads                   | **Off** (including anchor, vignette, side rail)                                                                    | Auto ads inject units anywhere, bypass reserved space (CLS), and could appear on portal pages. |
| Ad units                   | 4 display units: `in-article`, `sidebar`, `end-of-article`, `list` (responsive; `sidebar` vertical)                 | One unit per slot kind in `config.ts`; unit IDs go in `NEXT_PUBLIC_AD_SLOT_*`.          |
| Blocking controls          | Block sensitive categories: gambling and betting, dating, get-rich-quick, and similar                              | Online gambling ads are illegal in Indonesia and hurt trust in a developer blog.        |
| Ad review                  | Review weekly in the first months                                                                                  | Catch bad creatives early.                                                             |
| Sites                      | `dewasuryahub.com` now; each product domain when it shows ads                                                      | Ads served only on approved sites.                                                      |

**`ads.txt`.** `public/ads.txt` contains the single record from the AdSense console, for example:

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

It is served from the site root (`/ads.txt`; `proxy.ts` already skips files with an extension). Each product domain serves its own copy.

**Approval.** Apply only after the site has a clear set of original articles, the `/privacy` page (§6.3), and working navigation. Until approval, production keeps `NEXT_PUBLIC_AD_CLIENT` empty, so no ad code loads (current behaviour of `AdScript`).

**Configuration.** `NEXT_PUBLIC_*` values are inlined at build time, so they go in `.env.production` for the CI build (ADR-007), not only in `wrangler.jsonc` `vars`.

| Variable                              | Production value      |
| ------------------------------------- | --------------------- |
| `NEXT_PUBLIC_AD_CLIENT`               | `ca-pub-XXXXXXXXXXXXXXXX` |
| `NEXT_PUBLIC_AD_SLOT_IN_ARTICLE`      | unit ID               |
| `NEXT_PUBLIC_AD_SLOT_SIDEBAR`         | unit ID               |
| `NEXT_PUBLIC_AD_SLOT_END_OF_ARTICLE`  | unit ID               |
| `NEXT_PUBLIC_AD_SLOT_LIST`            | unit ID               |
| `NEXT_PUBLIC_AD_PLACEHOLDERS`         | `false` (`true` in local dev and preview deployments) |

Preview deployments never set `NEXT_PUBLIC_AD_CLIENT`: showing real ads on `*.workers.dev` wastes impressions and can be flagged as invalid traffic.

## 5. Placement

### 5.1 Pages

| Route                                 | Ads | Slots                                                                              | Change      |
| ------------------------------------- | --- | ---------------------------------------------------------------------------------- | ----------- |
| `/` (home)                            | No  | —                                                                                  | Keep        |
| `/about`                              | No  | —                                                                                  | Keep        |
| `/privacy`                            | No  | —                                                                                  | New page    |
| `/blog`, `/blog/category/*`, `/blog/tag/*` | Yes | `list`, after the first 6 cards (`_lib/article-list.tsx`)                     | Keep        |
| `/blog/[slug]`                        | Yes | `in-article-1..3`, `sidebar` (desktop), `end-of-article` (ADR-009 §7.5)            | Keep        |
| `/products`                           | Yes | `list` at the end of the page                                                      | Keep        |
| `/products/[productCode]`             | **No** | —                                                                               | **Remove** the `list` slot |
| `(auth)`, `sso`, `(portal)`, `(admin)`, checkout | No | — (admin preview shows grey placeholders, ADR-009)                       | Keep        |

**Why remove ads from the product detail page.** It is the page that sells the "no ads" plan and links to checkout. An ad there competes with the call to action, may show a competitor, and sits close to a button, which raises the risk of accidental clicks under AdSense policy.

### 5.2 Slot rules

| #   | Rule                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | At most **5 units per page** (3 in-article + sidebar + end-of-article on a long article). Short articles (< 8 top-level blocks) get only `end-of-article` and `sidebar`. |
| P2  | Every slot keeps its reserved `min-height` from `config.ts`, whether the ad fills, is empty, or is blocked. CLS budget for ads is 0.          |
| P3  | Every slot has a visible "Advertisement" / "Iklan" label (`labels.body.advertisement`), so ads are never mistaken for content.               |
| P4  | No slot within the first screen of an article on mobile. `in-article-1` comes after the 3rd block (ADR-009), below the cover image (the LCP element). |
| P5  | No slot next to a button, form, or link list (for example the product CTA, pagination, or the footer).                                      |
| P6  | The ad script loads with `strategy="lazyOnload"` (already so), after LCP.                                                                     |
| P7  | Adding a slot kind means: a unit in the AdSense console, a key in `config.ts`, and an env var. There is no other place to change.             |

## 6. Consent

### 6.1 What needs consent

| Storage / script                                        | Purpose                           | Consent needed?                           |
| ------------------------------------------------------- | --------------------------------- | ----------------------------------------- |
| AdSense cookies and identifiers (Google and its partners) | Ad personalisation, measurement   | **Yes** in EEA, UK, Switzerland (TCF)     |
| Firebase Auth (IndexedDB)                               | Keeps the user signed in          | No — strictly necessary                   |
| `localStorage.theme`                                    | Light / dark choice               | No — strictly necessary, set by the user  |
| Article editor local draft (admin only)                 | Crash recovery (ADR-009 §6)       | No — admin only, strictly necessary       |
| Embeds (YouTube via `youtube-nocookie.com`, Vimeo, …)   | Video playback                    | No banner — click-to-load facade (ADR-009 §7.3); nothing loads until the visitor clicks |

The hub uses **no analytics** today. Adding analytics (for example Google Analytics or Cloudflare Web Analytics) needs its own decision on consent and Consent Mode; it is out of scope here.

### 6.2 Google Privacy & messaging

**Decision.** Create the consent messages in AdSense → **Privacy & messaging**. For AdSense sites the message is delivered by the same `adsbygoogle.js` tag, so no extra script tag is added to the page.

| Message                         | Regions                         | Setting                                                                                   |
| ------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| European regulations (GDPR/TCF) | EEA, UK, Switzerland (Google's geo) | Buttons **Consent**, **Do not consent**, **Manage options** — "Do not consent" on the first layer, so refusing is as easy as agreeing. Languages: Indonesian and English. Link to `/privacy`. |
| US state regulations            | US states covered by Google     | Enable (free, same tool); low traffic expected.                                           |
| Other regions (Indonesia, SEA)  | —                               | No banner. Personalised ads under Google's default. Disclosed in `/privacy`, with an opt-out link to Google Ads Settings. |

**Behaviour.**

- Refusal is a normal case: AdSense then serves non-personalised or limited ads. Slots stay the same size (P2).
- The choice is stored by the CMP (TC string cookie on our domain), not by our code. No hub table or API stores consent.
- The banner appears only on `(site)` pages, because only they load the tag. That is enough: no other page loads ad code (§7).
- Because the tag is `lazyOnload`, the banner appears after the page is ready. It is an overlay, so it causes no layout shift.

**Indonesia (UU PDP No. 27/2022).** The hub does not collect personal data for ads itself; Google is the controller of ad data. The hub meets its duty to inform through `/privacy`. If Indonesian guidance later requires prior consent for ad cookies, turn on a Privacy & messaging message for all regions (a console change, no code). Check this with current guidance before launch.

### 6.3 Privacy page and "Privacy choices" link

**`/privacy`** (new, `(site)`, static, `id` and `en`, indexed, no ads). It must cover at least:

- what the hub stores (account data from Google sign-in, subscriptions, transactions — ADR-004),
- that third-party vendors, including Google, use cookies to serve ads based on prior visits, and that Google's advertising cookies let it and its partners serve ads based on visits to this and other sites,
- how to opt out (Google Ads Settings, and the "Privacy choices" link),
- processors: Firebase, Supabase, AWS, Cloudflare, Midtrans (ADR-001),
- contact email (ADR-006).

**"Privacy choices" link.** `SiteFooter` gets a button that reopens the consent message:

```tsx
// components/ads/privacy-choices-button.tsx (shape, not final code)
"use client";
export function PrivacyChoicesButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        (window.googlefc = window.googlefc || {}).callbackQueue = window.googlefc.callbackQueue || [];
        window.googlefc.callbackQueue.push({ CONSENT_DATA_READY: () => window.googlefc.showRevocationMessage() });
      }}
    >
      {label}
    </button>
  );
}
```

- It lives in `components/ads/` (rule I6). `components/layout` may not import it (ESLint `ADS_ANY`), so the `(site)` layout passes it to `SiteFooter` as a prop (`privacyChoices?: ReactNode`).
- Rendered only when `adsEnabled()`; otherwise the footer shows just the `/privacy` link.

## 7. Keeping the Ad Script Out of Signed-in Pages

`AdScript` is mounted by the `(site)` layout. On a client-side navigation from `/blog/x` to `/account`, Next.js swaps the layout but **does not unload scripts that already ran**. The ad tag (and any creative-loader it started) keeps running in the same document where the portal later reads the Firebase ID token. This breaks D4 and D6.

**Decision.** Any link from a `(site)` page to a route outside `(site)` is a full page load:

| Rule | Detail                                                                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1   | Add `components/common/hard-link.tsx`: a plain `<a>` that adds the locale prefix (same as `@/i18n/navigation` `Link`) but has no client routing.     |
| N2   | Use it in `SiteNav` (`/account`, sign-in) and `SiteFooter` (`/login`, `/account/subscriptions`, `/account/transactions`), and for the product CTA to `/checkout/[planCode]`. |
| N3   | Portal → site links may stay client-side (no ad code is involved). A visitor who opens `/blog` from the portal gets the ad tag, and a later hard link back to the portal drops it again. |
| N4   | A Vitest check (or ESLint rule) fails if a file under `app/[locale]/(site)/**` or `components/layout/site-*` passes `/login`, `/account`, `/checkout`, `/admin`, or `/sso` to `Link`. |

Cost: one extra full load when a visitor signs in from the site. Portal and admin pages are static shells, so this is fast.

## 8. Content Security Policy

`next.config.ts` `headers()` gains a CSP per route group. Static headers only: nonces would force per-request rendering and break ISR (D5).

### 8.1 Site pages (`(site)`, `/privacy`) — report-only first

AdSense loads creatives from many Google-owned hosts that change over time, so an enforced allowlist would break ads silently. The site starts with **`Content-Security-Policy-Report-Only`** plus a few **enforced** directives that do not affect ads:

```
# Enforced
Content-Security-Policy:
  object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'

# Report-only (tighten from real reports, then enforce)
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com
             https://*.adtrafficquality.google https://fundingchoicesmessages.google.com https://www.google.com https://*.gstatic.com;
  frame-src  https://*.googlesyndication.com https://*.doubleclick.net https://www.google.com https://*.adtrafficquality.google
             https://fundingchoicesmessages.google.com
             https://www.youtube-nocookie.com https://player.vimeo.com https://codesandbox.io https://www.figma.com;
  img-src    'self' data: https://<cloudfront-domain> https://i.ytimg.com https: ;
  connect-src 'self' https://api.dewasuryahub.com https://*.google.com https://*.googlesyndication.com
              https://*.doubleclick.net https://*.adtrafficquality.google https://fundingchoicesmessages.google.com;
  style-src  'self' 'unsafe-inline';
  font-src   'self';
  report-uri /api/csp-report
```

- `'unsafe-inline'` in `script-src` is needed for the theme script (`InlineScript`) and Next.js inline bootstrap without nonces.
- `img-src https:` stays wide: ad creatives use many image hosts. This is accepted for public pages only.
- The embed hosts come from ADR-009 §5.4 and §7.3.
- **Enforce** the report-only policy after about 4 weeks with no unexpected reports from real ad traffic.

### 8.2 Other pages (`(auth)`, `sso`, `(portal)`, `(admin)`, checkout) — enforced, no ad hosts

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com
             https://app.midtrans.com https://app.sandbox.midtrans.com;
  frame-src  https://<firebase-auth-domain> https://accounts.google.com
             https://app.midtrans.com https://app.sandbox.midtrans.com;
  connect-src 'self' https://api.dewasuryahub.com https://*.googleapis.com https://securetoken.googleapis.com
              https://identitytoolkit.googleapis.com;
  img-src    'self' data: https://<cloudfront-domain> https://lh3.googleusercontent.com;
  style-src  'self' 'unsafe-inline';
  object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
```

- No ad or CMP hosts. If an ad tag ever appears here, the browser blocks it (defence for §7).
- Admin editor needs are added by ADR-009 work (media uploads to the API, link previews).
- Midtrans hosts are only needed under `/checkout`; keeping them for all non-site routes keeps the header list short.

### 8.3 Reports

`app/api/csp-report/route.ts` accepts reports, drops anything over 8 KB, and writes one log line per report (sampled at 10 %) through `lib/logger.ts`. It stores nothing. Cloudflare Workers observability (`wrangler.jsonc`) keeps the logs.

## 9. `removeAds` in Connected Products

The hub's own pages are ISR and cached for everyone, so they cannot vary by user. The hub site therefore shows the same ads to every visitor, including Pro subscribers. `removeAds` belongs to each product (ADR-003 §8.4 N3).

Rules for Document Doctor and every later product that shows ads:

| #   | Rule                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Read `features.removeAds` from `GET /products/{productCode}/entitlements/me` (UC-07). Cache for up to 5 minutes (ADR-002 E1).                                |
| R2  | `removeAds: true` → the product **does not load the ad tag at all** (no script, no CMP, no empty boxes). Hiding with CSS is not allowed.                     |
| R3  | While the entitlement is loading, render nothing where ads go and do not load the tag, so a paying user never sees an ad flash.                               |
| R4  | On `?entitlement=refresh` (return from hub checkout, ADR-003 §8.5) re-check before deciding.                                                                 |
| R5  | Unknown or failed entitlement → treat as free (`removeAds: false`) for ads, as ADR-003 N2 does for paid features.                                             |
| R6  | The product uses the same AdSense account, adds its domain as a site, serves its own `ads.txt`, and uses its own Privacy & messaging messages.                |
| R7  | Same slot rules as §5.2 (reserved space, label, no ads next to buttons, no Auto ads).                                                                        |

## 10. Rollout

| Step | Phase | Work                                                                                                                                        |
| ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | P1    | Remove the slot from `/products/[productCode]`. Add `/privacy` (+ `site.json` keys `privacy.*`, `footer.privacy`, `footer.privacyChoices`). |
| 2    | P1    | Hard links from site to portal/auth/checkout (§7) and the N4 check.                                                                          |
| 3    | P1    | CSP headers (§8) and `/api/csp-report`; enforced on non-site routes from day one, report-only on site.                                      |
| 4    | P1    | Apply to AdSense with enough published articles. Put the real record in `public/ads.txt`.                                                   |
| 5    | P1    | After approval: create the 4 units, set blocking controls, turn Auto ads off, **publish the GDPR and US messages before** setting `NEXT_PUBLIC_AD_CLIENT` in production. |
| 6    | P1    | Add `PrivacyChoicesButton` to the footer. Deploy with the ad env vars.                                                                       |
| 7    | P1+4 w | Check CLS/LCP (Search Console Core Web Vitals, PageSpeed) and CSP reports. Enforce the site CSP.                                           |
| 8    | P2    | Document Doctor follows §9 when it connects to the hub.                                                                                     |

## 11. Alternatives Considered

| Option                                                         | Why not (now)                                                                                                                                   |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **EthicalAds / Carbon Ads** (developer-focused, no tracking)    | Better fit for a dev blog and need no consent banner, but both need approval and steady traffic, and fill is limited outside the US/EU. **First choice to revisit** when traffic grows. |
| **Ezoic, Mediavine, Raptive**                                   | Higher RPM, but traffic minimums (Mediavine and Raptive) or heavy scripts that hurt LCP (D2), and they take control of placement.              |
| **Adsterra, PropellerAds** (low-barrier networks)               | Pop-unders and low-quality creatives hurt trust and SEO.                                                                                        |
| **AdSense Auto ads**                                            | No code, but places ads anywhere, causes layout shift, and ignores the site/portal split.                                                       |
| **Self-built consent banner + Google Consent Mode**             | Google requires a **certified** CMP for EEA/UK ads; a self-built banner is not certified, so EEA traffic would get only limited ads.             |
| **Third-party CMP** (Cookiebot, Osano, CookieYes)               | Certified, but paid above small limits or adds one more script. Google's CMP is free and already inside the ad tag.                             |
| **Hide hub ads for Pro users** (client-side, after sign-in)     | Pages are ISR and cached for all; hiding would need the Firebase SDK on every site page and a flash of ads first. `removeAds` is a product feature. |
| **Nonce-based strict CSP** (Google's recommended CSP for AdSense) | Needs a nonce per response, so every public page becomes per-request rendered — breaks ISR and the Workers CPU budget (ADR-008 D2).            |
| **Separate origin for the portal** (`app.<domain>`)             | Strongest isolation of the ID token from ad code, but a second deployment, a second Firebase authorised domain, and changes to ADR-001/003/008. Hard links (§7) plus the strict CSP (§8.2) are enough for now. |

## 12. Consequences

### 12.1 Positive

- US$0 cost, no traffic minimum, and certified consent without writing a banner.
- Ads cannot shift the layout: every slot is reserved (P2) and Auto ads are off.
- The ad tag never runs on signed-in pages: blocked by design (§7) and by the browser (§8.2).
- A product can drop ads for paying users with one flag it already receives.

### 12.2 Negative and risks

| Risk                                                                                          | Mitigation                                                                                                              |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AdSense rejects the site or suspends the account (thin content, invalid clicks).               | Apply only with enough original articles; no ads near buttons (P5); never click own ads; no real ads on previews.       |
| Low RPM on a small, SEA-heavy audience.                                                        | Accepted; the product plan is the main income. Revisit EthicalAds/Carbon (§11) when traffic grows.                      |
| Ads still hurt LCP/INP on slow phones.                                                         | `lazyOnload`, max 5 units (P1), measure in step 7; cut `in-article-3` first if INP or LCP degrades.                    |
| Report-only site CSP gives no protection against script injection on public pages.             | Public pages hold no token and no user data; article HTML comes only from the allowlisted renderer (ADR-009). Enforce after step 7. |
| The ad tag runs in the same origin as the portal and could read Firebase IndexedDB on site pages. | Only Google's tag (no other vendors, no header bidding); creatives run in cross-origin iframes; site pages do not load the Firebase SDK. Separate origin is the fallback (§11). |
| Ad blockers (common among developers) hide ads.                                                | Accepted. Slots keep their space; no ad-block wall.                                                                     |
| Google's hosts, CMP API, or policies change.                                                   | CSP reports show new hosts; check AdSense policy and the Privacy & messaging docs before each phase launch.            |
| Indonesian PDP guidance on ad cookies becomes stricter.                                        | Turn on a consent message for all regions in Privacy & messaging (config only, §6.2).                                   |

## 13. When to Revisit

- Monthly traffic is high enough for EthicalAds/Carbon, or for a managed network whose script stays within the LCP budget.
- Core Web Vitals on article pages fail because of ads for two weeks in a row.
- Analytics is added (needs a consent decision and Consent Mode).
- The portal moves to its own origin, or the site needs an enforced CSP that AdSense cannot meet.
- A product needs the hub site itself to hide ads for its subscribers.

## 14. Changes to Other ADRs

| ADR     | Section            | Change                                                                                               |
| ------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| ADR-001 | §5.2 "Ads rules"   | "product pages" → "the products list" (§5.1). Consent banner: decided (§6).                          |
| ADR-001 | §9                 | ADR-005 status → Proposed, with a link to this file.                                                 |
| ADR-008 | §4.2 route table   | Add `(site)` `/privacy` (phase 1, no API) and `app/api/csp-report/route.ts`.                         |
| ADR-008 | §4.2 rules         | Add N1–N2: links from `(site)` to other route groups are full page loads.                            |
| ADR-008 | §12 follow-up      | CSP row → done here (§8).                                                                            |
| ADR-009 | §12 follow-up      | Ad network, consent, and embed CSP → done here (§6, §8.1).                                           |
