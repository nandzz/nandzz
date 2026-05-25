# nandzz

**The home for AI-generated web apps.**

nandzz is a platform where you can save, host, and share the web apps you build with AI tools like Claude or ChatGPT. Drop in raw HTML or link a URL — your creation gets its own Space, a public page where the world can discover and like it.

---

## What is a Space?

A **Space** is a shared web app. It has:

- A title and description
- A URL or uploaded HTML file
- A preview image
- A like count
- A public profile page for its author

---

## Features

- **Upload HTML or link a URL** — paste your AI-generated code or point to any live URL
- **Public feed** — browse what the community is building on the Explore page
- **User profiles** — public pages with all Spaces from a given creator
- **Likes** — upvote the Spaces you find useful or cool
- **Dark mode** — full light/dark theme support
- **Auth** — email/password sign up and login via Supabase

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Base UI variant) |
| Auth & DB | Supabase |
| Storage | Supabase Storage |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/nandzz/nandzz.git
cd nandzz
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run the schema in the Supabase SQL editor:

```
supabase-schema.sql
```

### 3. Configure environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
  app/                  # Next.js App Router pages
    dashboard/          # Authenticated user area (create, edit spaces)
    explore/            # Public feed of all spaces
    profile/[username]/ # Public user profiles
    space/[id]/         # Individual space viewer
    login/              # Auth page
  components/
    spaces/             # SpaceCard, SpaceForm, SpaceGrid, LikeButton
    layout/             # Navbar, Footer
    profile/            # ProfileHeader, ProfileTabs
    ui/                 # shadcn/ui primitives
  lib/
    supabase/           # Client and server Supabase helpers
    types.ts            # Shared TypeScript types
```

---

## License

MIT
