# Nandzz — SEO Strategy

**Business type:** SaaS + Community (Creative gallery platform)  
**Target:** Creators, developers, and AI enthusiasts who build and share web apps, HTML pages, and interactive tools.  
**Domain:** nandzz.com  
**Plan created:** 2026-05-27

---

## 1. Keyword Strategy

### Primary (high-intent)
| Keyword | Intent | Target Page |
|---|---|---|
| share web apps online | Transactional | `/` |
| AI app gallery | Informational | `/explore` |
| share interactive web pages | Transactional | `/` |
| HTML app hosting free | Transactional | `/pricing` |
| web app showcase community | Informational | `/explore` |
| share AI generated websites | Transactional | `/` |

### Secondary (growth)
| Keyword | Intent | Target Page |
|---|---|---|
| online portfolio for web apps | Informational | `/[username]` |
| share PDF files online | Transactional | `/` |
| interactive HTML page hosting | Transactional | `/pricing` |
| web creation community | Informational | `/explore` |
| AI tools gallery | Informational | `/explore` |

### Long-tail (content opportunities)
- "how to share an AI generated website"
- "best way to host interactive web pages"
- "where to showcase AI apps"
- "free web app portfolio hosting"

---

## 2. Site Architecture

```
nandzz.com/
├── /                     ← Homepage (hero, recent spaces, CTA)
├── /explore              ← Community gallery (paginated)
├── /pricing              ← Plans (Free vs Pro)
├── /[username]           ← User profile pages
│   └── /space/[id]       ← Individual space pages
├── /login                ← Auth (noindex)
├── /dashboard/*          ← Private (noindex via robots.ts)
├── /privacy              ← Legal
└── /terms                ← Legal
```

**Indexable:** `/`, `/explore`, `/pricing`, `/[username]`, `/[username]/space/[id]`, `/privacy`, `/terms`  
**Noindex:** `/dashboard/*`, `/api/*`, `/auth/*`, `/login`, `/forgot-password`

---

## 3. Technical SEO — Implemented ✅

| Item | Status | Details |
|---|---|---|
| `robots.ts` | ✅ Done | Blocks `/dashboard/`, `/api/`, `/auth/` |
| `sitemap.ts` | ✅ Done | Dynamic — pulls public profiles + spaces from Supabase |
| `metadataBase` | ✅ Done | Set to `https://nandzz.com` in root layout |
| Title templates | ✅ Done | `%s — nandzz` template on all pages |
| OG tags (root) | ✅ Done | type, locale, siteName, title, description |
| Twitter cards | ✅ Done | `summary_large_image` on root + space pages |
| Page-level metadata | ✅ Done | `/explore`, `/pricing`, `/`, `/[username]`, `/[username]/space/[id]` |
| JSON-LD schema | ✅ Done | WebSite, Organization, SoftwareApplication (with Offer) on homepage |
| Canonical URLs | ✅ Done | Explicit canonical on home, profile, and space pages |
| Profile OG metadata | ✅ Done | `type: "profile"`, avatar image, tagline |
| Space OG metadata | ✅ Done | Preview image, `summary_large_image` when image present |
| Googlebot directives | ✅ Done | max-image-preview: large, max-snippet: -1 |

---

## 4. Content Strategy

### Phase 1 (Now — Month 2): Foundation
**Goal:** Get indexed; establish topical authority.

- [ ] Add `og:image` default — create `/public/og-default.png` (1200×630) with nandzz branding. Reference it in root layout.
- [ ] Add `noindex` to `/login`, `/forgot-password`, `/auth/*` pages via their page metadata.
- [ ] Write descriptive `tagline` fields for the first 10 user profiles (seed SEO content for profile pages).
- [ ] Ensure all public Spaces have titles and descriptions (they contribute to indexed pages).

### Phase 2 (Month 2–4): Community Content
**Goal:** Earn long-tail traffic through UGC (user-generated content).

- [ ] Add a `category` or `type` field to Spaces (e.g. "AI App", "Game", "Tool", "Portfolio") — enables `/explore?category=game` pages.
- [ ] Add tag-based explore pages: `/explore/tag/[slug]` — each tag page is a rankable URL.
- [ ] Encourage descriptive Space descriptions with a character minimum in the UI.
- [ ] Add a "Featured Spaces" curation on the homepage for editorial SEO value.

### Phase 3 (Month 4–8): Authority Building
**Goal:** Rank for primary keywords; establish brand presence.

- [ ] Launch a `/blog` or `/guides` section with content on:
  - "How to share an AI-generated website for free"
  - "Best tools for sharing interactive web apps in 2026"
  - "Building an AI app portfolio: a beginner's guide"
- [ ] Add an `/about` page — Organization E-E-A-T signal.
- [ ] Explore `/compare` pages (e.g. `/vs-codepen`, `/vs-glitch`) for comparison traffic.
- [ ] Build backlinks through: ProductHunt launch, maker communities (Indie Hackers, Hacker News), AI tool directories.

---

## 5. Competitive Landscape

| Competitor | Strength | Our Angle |
|---|---|---|
| CodePen | Code editor focus | We're for sharing finished apps/pages |
| Glitch | Full app hosting | We focus on sharing + discovery, not hosting |
| Product Hunt | Product launches | We're for ongoing sharing, not one-time launches |
| Linktree | Profile pages | We're interactive — actual web apps, not just links |
| itch.io | Game focus | We're broader: AI apps, tools, PDFs, HTML pages |

**Differentiation to emphasize in SEO copy:** "Share interactive AI-generated creations instantly — no hosting required."

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

### C. Category/Tag explore pages
New route: `src/app/explore/tag/[slug]/page.tsx` — boosts long-tail indexation significantly.

### D. `<link rel="me">` for social verification
Add social profile links for authority signals.

### E. Web App Manifest
Create `src/app/manifest.ts` for PWA/app install signals.

---

## 8. Monitoring

Once live:
1. Submit `https://nandzz.com/sitemap.xml` to **Google Search Console** and **Bing Webmaster Tools**.
2. Set up **Google Analytics 4** (GA4) for organic traffic tracking.
3. Check **Core Web Vitals** in GSC — LCP and CLS are most important.
4. Monitor indexation weekly for the first month.
