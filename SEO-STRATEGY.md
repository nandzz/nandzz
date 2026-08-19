# Nandzz — SEO Strategy

**Business type:** SaaS — a branded business page + a suite of widgets.
**Target:** Solo pros (hair salon, cleaner, coach), small businesses, and institutions who want to be **found on social and booked in a tap** — with content and collections/pools alongside booking.
**Positioning:** "Your business, on one page. Get found — and get booked." Booking is only ONE widget; content and pools are equal parts of the story.
**Domain:** nandzz.com
**Plan created:** 2026-05-27 · **Rebranded:** 2026-08-15

---

## 1. Keyword Strategy

### Primary (high-intent)
| Keyword | Intent | Target Page |
|---|---|---|
| online booking page | Transactional | `/` |
| book appointments online | Transactional | `/` |
| branded business page | Transactional | `/` |
| link in bio with booking | Transactional | `/` |
| free scheduling page | Transactional | `/pricing` |
| get found and booked | Informational | `/` |

### Secondary (growth)
| Keyword | Intent | Target Page |
|---|---|---|
| booking page for small business | Informational | `/[username]` |
| appointment scheduling for solo pros | Informational | `/` |
| one page website with booking | Transactional | `/pricing` |
| calendar booking widget | Informational | `/` |
| business page for social bio | Informational | `/[username]` |

### Long-tail (content opportunities)
- "how to take bookings from Instagram bio"
- "best booking page for a solo hairdresser / cleaner / coach"
- "link in bio that also takes appointments"
- "free one-page site to get found and booked"

---

## 2. Site Architecture

```
nandzz.com/
├── /                       ← Homepage (hero, widget suite, "any business", how-it-works, CTA)
├── /pricing                ← Plans
├── /[username]             ← Branded public business page
│   ├── /space/[id]         ← Individual content (Space) pages
│   ├── /gallery            ← Per-profile image gallery (see-more)
│   ├── /contents           ← Per-profile publications (see-more)
│   └── /links              ← Per-profile links (see-more)
├── /login                  ← Auth (noindex)
├── /dashboard/*            ← Private app (noindex via robots.ts)
├── /privacy                ← Legal
└── /terms                  ← Legal
```

**Indexable:** `/`, `/pricing`, `/[username]`, `/[username]/space/[id]`, `/[username]/gallery`, `/[username]/contents`, `/[username]/links`, `/privacy`, `/terms`
**Noindex:** `/dashboard/*`, `/api/*`, `/auth/*`, `/login`, `/forgot-password`

> Note: there is **no** site-wide `/explore` / cross-user discovery page — it was removed during the brand pivot. Discovery happens via each owner's social bio linking to their `/[username]` page, not via an on-site gallery.

---

## 3. Technical SEO — Implemented ✅

| Item | Status | Details |
|---|---|---|
| `robots.ts` | ✅ Done | Blocks `/dashboard/`, `/api/`, `/auth/` |
| `sitemap.ts` | ✅ Done | Dynamic — pulls public profiles + spaces from Supabase |
| `metadataBase` | ✅ Done | Set to `https://nandzz.com` in root layout |
| Title templates | ✅ Done | `%s | Nandzz` template on all pages |
| OG tags (root) | ✅ Done | type, locale, siteName, title, description (rebranded) |
| Twitter cards | ✅ Done | `summary_large_image` on root + space pages |
| Page-level metadata | ✅ Done | `/`, `/pricing`, `/[username]`, `/[username]/space/[id]` |
| JSON-LD schema | ✅ Done | WebSite, Organization, SoftwareApplication (with Offer) on homepage |
| Canonical URLs | ✅ Done | Explicit canonical on home, profile, and space pages |
| Profile OG metadata | ✅ Done | `type: "profile"`, avatar image, tagline |
| Space OG metadata | ✅ Done | Preview image, `summary_large_image` when image present |
| Googlebot directives | ✅ Done | max-image-preview: large, max-snippet: -1 |
| i18n metadata | ✅ Done | root title/description/OG rebranded across all 7 locales |

---

## 4. Content Strategy

### Phase 1 (Now — Month 2): Foundation
**Goal:** Get indexed; establish the "get found & booked" positioning.

- [ ] Add `og:image` default — create `/public/og-default.png` (1200×630) with nandzz branding + the "Get found. Get booked." line. Reference it in root layout.
- [ ] Add `noindex` to `/login`, `/forgot-password`, `/auth/*` pages via their page metadata.
- [ ] Write descriptive `tagline` fields for the first 10 public profiles (seed SEO content for profile pages).
- [ ] Ensure public Spaces have titles and descriptions (they contribute to indexed pages).

### Phase 2 (Month 2–4): Owner-page content
**Goal:** Earn long-tail traffic through owners' branded pages.

- [ ] Encourage descriptive profile bios + service descriptions (they're the indexed copy).
- [ ] Ensure booking-widget pages expose readable service/availability metadata where public.
- [ ] Add a "Featured businesses" or category landing pages if/when volume justifies it.

### Phase 3 (Month 4–8): Authority Building
**Goal:** Rank for primary booking/branded-page keywords; establish brand presence.

- [ ] Launch a `/blog` or `/guides` section with content on:
  - "How to take bookings straight from your Instagram bio"
  - "Best one-page booking site for solo pros in 2026"
  - "Link-in-bio vs a real booking page: what actually gets you booked"
- [ ] Add an `/about` page — Organization E-E-A-T signal.
- [ ] Explore `/compare` pages (e.g. `/vs-linktree`, `/vs-calendly`, `/vs-fresha`) for comparison traffic.
- [ ] Build backlinks through: ProductHunt launch, small-business / creator communities, booking-tool directories.

---

## 5. Competitive Landscape

| Competitor | Strength | Our Angle |
|---|---|---|
| Linktree / Beacons / Stan | Own "be found from social" | We add real booking + content, not just links |
| Calendly / Acuity | Own scheduling | We're a branded page, not a bare calendar link |
| Fresha / Booksy / Vagaro | Own "get booked" | We're not vertical-locked to beauty; composable widgets |
| Squarespace / Wix | Full website builders | We're the fast presence + action layer, not heavy DIY |

**Differentiation to emphasize in SEO copy:** the presence layer (branded page) **and** the action layer (booking + more widgets) in one, composable and not vertical-locked — "Get found on social, booked in a tap."

---

## 6. KPI Targets

| Metric | Now | 3 months | 6 months | 12 months |
|---|---|---|---|---|
| Indexed pages | ~0 | 50+ | 500+ | 2,000+ |
| Organic sessions/mo | 0 | 200 | 1,500 | 8,000 |
| Ranking keywords | 0 | 20 | 100 | 400 |
| Profile pages indexed | 0 | 20 | 200 | 1,000+ |

---

## 7. Remaining Quick Wins (Not Yet Implemented)

### A. Default OG Image
Create `/public/og-default.png` and add to root layout:
```ts
openGraph: {
  images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "nandzz" }],
}
```

### B. Noindex auth/login pages
Add to `/src/app/login/page.tsx`, `/src/app/forgot-password/page.tsx`:
```ts
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
```

### C. `<link rel="me">` for social verification
Add social profile links for authority signals.

### D. Web App Manifest
Confirm `src/app/manifest.ts` (or `site.webmanifest`) is complete for PWA/app-install signals.

---

## 7b. AI Search / GEO — Implemented ✅

Making content discoverable and citable by AI answer engines (ChatGPT, Claude, Perplexity, Google AI Overviews).

| Item | Status | Details |
|---|---|---|
| AI crawlers allowed | ✅ Done | `robots.ts` uses wildcard `allow: "/"` — GPTBot, PerplexityBot, ClaudeBot, Google-Extended can all cite us |
| `/llms.txt` | ✅ Done | Static `public/llms.txt` — product overview, positioning, competitor framing, key page links |
| `/pricing.md` | ✅ Done | Dynamic route (`src/app/pricing.md/route.ts`) built from live `subscription_plans` + `credit_packs` — machine-readable pricing for AI buying-agents, stays in sync |
| `FAQPage` schema — pricing | ✅ Done | JSON-LD on `/pricing` from the shared `pricingFaqs` source (matches the visible FAQ) |
| `FAQPage` schema + FAQ — home | ✅ Done | Localised FAQ section in `HomeClient` + matching JSON-LD (built from `t.home.faq`, so schema tracks the rendered locale) |
| `SoftwareApplication` offers | ✅ Done | Homepage offers now generated from the live plan catalog via `getPublicPricing()` — no more stale hardcoded `$9 Pro` |

**Still open (AI-SEO):**
- [ ] Default `og:image` (1200×630) — needs a real design asset; currently falls back to `/logo.png`.
- [ ] Third-party presence (the biggest GEO lever): review-site profiles, ProductHunt, creator/small-biz community mentions — AI cites third-party sources more than owned domains.

## 8. Monitoring

Once live:
1. Submit `https://nandzz.com/sitemap.xml` to **Google Search Console** and **Bing Webmaster Tools**.
2. Set up **Google Analytics 4** (GA4) for organic traffic tracking.
3. Check **Core Web Vitals** in GSC — LCP and CLS are most important.
4. Monitor indexation weekly for the first month.
