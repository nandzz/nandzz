# Feature-Based Architecture Migration

Living roadmap for moving the Portal from a layer-based structure (`components/`,
`lib/`, `app/api/`) to **feature-based** modules under `src/features/`, where each
feature owns its data access and **UI never touches Supabase directly**.

Status: **`social` + `collections` shipped**. Rolling out feature-by-feature.

---

## 1. Why (context)

The layout was never the real problem — the missing **data-access boundary** was:

- ~259 `.from()` + 15 `.rpc()` calls across ~100 files; **37 inside `"use client"`
  components**. Table names, `auth.getUser()` checks, and error handling inlined next
  to JSX.
- Three uncoordinated data paths with no rule: direct browser-client `.from()` in
  components, raw `fetch('/api/*')` (39 places), and Server Actions (only 2 existed).
- No repository/service layer, no react-query/SWR, no zod.

Goal: each feature exposes a small public API; reads go through a server-only `data/`
layer, mutations through zod-validated Server Actions. Fix the boundary **as** we
colocate — one feature per PR, app shippable throughout.

---

## 2. Target layout & conventions

```
src/features/<feature>/
  components/    "use client"/presentational only — NO @/lib/supabase import (lint-enforced)
  data/          server-only reads: `import "server-only"`; take a SupabaseClient arg
  actions/       "use server" mutations; zod-validated; return a discriminated result
  hooks/         optional client hooks
  schemas.ts     zod schemas
  types.ts       feature-owned types (optional; shared types stay in @/lib/types for now)
  index.ts       CLIENT-SAFE barrel (components, action/type re-exports)
  server.ts      SERVER-ONLY barrel (data/ read helpers)
```

**Non-negotiable rules**
1. **Split barrels.** `index.ts` must be safe to import from a Client Component.
   Anything that transitively pulls `import "server-only"` (i.e. the `data/` layer)
   goes in `server.ts` only. Server Components import reads from `@/features/<f>/server`;
   everyone imports components/actions from `@/features/<f>`.
2. **Actions use the SSR server client** (`@/lib/supabase/server`), not the admin
   client, so RLS stays the real guard. The in-action `auth.getUser()` check is
   defense-in-depth. Use the admin client only where a route legitimately must bypass
   RLS (and document why).
3. **Discriminated result contract** (mirrors `lib/actions/publish-space.ts`):
   `{ ok: true, ...data } | { ok: false, error: CODE, message? }`. Client reconciles
   local optimistic state from the `ok:true` payload; on `ok:false` reverts and, for
   `UNAUTHENTICATED`, routes to `/login`.
4. **zod at the action boundary.** Server Actions are POST-reachable independently of
   the UI — validate every input. IDs are Postgres `gen_random_uuid()` → use `z.uuid()`
   (zod v4 enforces RFC-4122 variant bits; test fixtures must be real v4 UUIDs).
5. **Keep `router.refresh()`** in mutation components (inside the transition) for
   cross-view consistency, on top of reconciling from the action result.

**Stays shared (do not move into features):** `components/ui/`, `components/layout/`,
`lib/supabase/`, `lib/utils.ts`, `lib/i18n/`, `contexts/`, `lib/types.ts` (for now).

---

## 3. Per-feature recipe (the loop executes this, one feature per iteration)

1. **Scaffold** `src/features/<f>/{components,data,actions,index.ts,server.ts}` (+`schemas.ts`).
2. **Move components** in; delete their `@/lib/supabase/*` imports.
3. **Extract data access**: every `.from()/.rpc()` becomes either a `data/` read
   (server-only, takes a `SupabaseClient`) or an `actions/` mutation (`"use server"`,
   zod-validated, discriminated result). Replace client `fetch('/api/*')` **mutations**
   with actions. Keep `/api/*` routes only where a real HTTP endpoint is required
   (webhooks, MCP, public widget embed) — do not convert those.
4. **Rewire imports**: point route/page/component imports at the feature barrels;
   route server-page reads through `@/features/<f>/server`. Delete the old files.
5. **Guardrail**: the ESLint `no-restricted-imports` rule in `eslint.config.mjs` already
   globs `src/features/*/components/**` — no per-feature change needed; it auto-covers
   new features. (Widen beyond `features/` only once a whole domain is migrated.)
6. **Tests**: add colocated `*.test.ts` for each new action + data module (see the
   `features/social` tests for the Supabase-stub pattern). `server-only` is aliased to a
   no-op in `vitest.config.ts` so `data/` layers are testable.
7. **Verify** (all must pass): `npx tsc --noEmit`, `npx eslint src/features`,
   `npx vitest run src/features/<f>`.
8. **Update this doc's checklist**, then **commit directly to `main`** (no branches,
   no push — per project instruction). One commit per feature.

---

## 4. Requirements / one-time setup (done in the pilot)

- [x] `zod` dependency added (v4).
- [x] ESLint guardrail (`no-restricted-imports`, `@/lib/supabase/*`) scoped to
  `src/features/*/components/**`.
- [x] `server-only` aliased to `src/test/server-only-stub.ts` in `vitest.config.ts`.
- [x] Discriminated-result + split-barrel conventions established by `features/social`.

---

## 5. Migration checklist (order = isolation & value)

| # | Feature | Scope highlights | Status |
|---|---------|------------------|--------|
| 0 | **social** (likes+follows) | LikeButton, FollowButton; reads across 5 server pages | ✅ done (pilot) |
| 1 | **collections** | AddToCollectionDialog, StarButton, NewCollectionForm, CollectionActions; `is_public:false` invariant | ✅ done |
| 2 | **comments** | `components/spaces/comments/*` (CommentsList/Item, CommentLikeButton) | ⬜ todo |
| 3 | **profile** | ProfileBackground (9 `.from()`), EditProfileDialog, settings/brand pages, **FollowList** (deferred client list) | ⬜ todo |
| 4 | **spaces** | biggest: HtmlSpaceEditor (10 `.from()`), builders/, AiAssistantPanel, SpaceCard — split into sub-PRs; fold in `lib/actions/publish-space.ts` | ⬜ todo |
| 5 | **booking / widgets** | already clustered (`components/widgets/calendar/`, `lib/widgets/`, `api/widgets/`); watch WidgetWorkspace realtime + Staff/Location storage uploads | ⬜ todo |
| 6 | **agent** | AgentChat, AgentStudio, `api/agent/*`, `lib/agent/*` | ⬜ todo |
| 7 | **analytics + layout chrome** | NotificationBell, Navbar, Sidebar, MobileTabBar, AiJobsIndicator; fold in `lib/actions/record-view.ts` | ⬜ todo |

---

## 6. Deferrals & gotchas (read before each iteration)

- **FollowList** (`components/profile/FollowList.tsx`) is a client component that fetches
  paginated follower/following lists with joins on mount. It needs a client-data-fetch
  pattern (a Server Action or route returning the list) — do it in the **profile**
  migration, not piecemeal. It does not trip the `features/`-scoped guardrail while it
  stays put.
- **Pre-existing failing tests** (NOT caused by this migration — confirmed identical on
  clean `main`; do not chase them): `src/app/api/widgets/[instanceId]/availability/route.test.ts`,
  `src/app/api/widgets/bookings/[token]/route.test.ts`, `src/components/spaces/SpaceGrid.test.tsx`.
  Also a pre-existing lint error in `ProfileHeader.tsx` (`react-hooks/set-state-in-effect`
  on the avatar effect). Scope verification to `src/features/**` to avoid the noise.
- **Next.js 16 is modified** (see `AGENTS.md`): read `node_modules/next/dist/docs/` before
  using an unfamiliar Server-Action / cache API rather than assuming training-data behavior.
- **collections**: preserve the `is_public: false` default on every collection insert
  (DB default is still `true`) — see the collections memory.

---

## 7. Autonomous loop operating instructions

When continuing this migration unattended:

1. Read this doc's checklist; pick the **first `⬜ todo`** feature.
2. Execute the **§3 recipe** for exactly **one** feature per iteration. Do not batch.
3. Verify scoped to `src/features/**` (§3.7). If anything is red, **stop the loop** and
   report — do not commit a broken feature.
4. On green: update the checklist row to ✅, then **commit directly to `main`** (no
   branches — per project instruction). One commit per feature. **Never push, never
   open a PR** without explicit user approval.
5. Stop the loop and ask the user when a feature needs a product decision (e.g. a client
   list that needs a new fetch pattern, or a `/api/*` route whose fate is unclear).
6. Keep commits small and messages descriptive; end with the Co-Authored-By trailer.
