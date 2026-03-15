# Development Guide

**Generated:** 2026-03-15 | **Scan Level:** Exhaustive

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | 22.x | Required (enforced in package.json) |
| npm | 10.x+ | Comes with Node 22 |
| MongoDB | 4.x+ | Local instance or MongoDB Atlas |
| Git | 2.x+ | Version control |

---

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd kyle-nextjs13-app
npm install
```

### 2. Environment Variables

Create `.env.local` at project root:

```env
# AniList GraphQL API
GRAPHQL_ANILIST=https://graphql.anilist.co
NEXT_PUBLIC_GRAPHQL_ANILIST=https://graphql.anilist.co

# MongoDB
MONGODB_URI=mongodb://localhost:27017/kyle-anime

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# OAuth Providers
GITHUB_ID=<your-github-oauth-app-id>
GITHUB_SECRET=<your-github-oauth-app-secret>

TWITTER_CLIENT_ID=<your-twitter-oauth2-client-id>
TWITTER_CLIENT_SECRET=<your-twitter-oauth2-client-secret>

GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
```

### 3. OAuth Provider Setup

- **GitHub:** Create OAuth App at https://github.com/settings/developers — callback URL: `http://localhost:3000/api/auth/callback/github`
- **Twitter:** Create app at https://developer.twitter.com — callback URL: `http://localhost:3000/api/auth/callback/twitter`
- **Google:** Create credentials at https://console.cloud.google.com — callback URL: `http://localhost:3000/api/auth/callback/google`

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (port 3000) |
| `npm run build` | Production build (SSG + serverless) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run clean` | Remove `node_modules/` and `.next/` |
| `npm run buildtw` | Tailwind CSS watch mode |
| `npm run tw:dev` | Tailwind + Next.js dev server |
| `npm run tw:build` | Tailwind + Next.js production build |
| `npm run resetlocal` | Clean install (remove + reinstall) |

---

## Local Development

### Quick Start

```bash
npm run dev
# Open http://localhost:3000
```

### With Tailwind Watch Mode

```bash
npm run tw:dev
```

This runs Tailwind CSS in watch mode alongside the Next.js dev server, ensuring style changes are compiled immediately.

---

## Build Process

```bash
npm run build
```

**What happens during build:**
1. Tailwind CSS compiles to `styles/dist.css`
2. TypeScript compilation with strict checks
3. Next.js SSG generates 24+ static season pages
4. Each page fetches data from AniList GraphQL API
5. **Single-threaded** to avoid AniList API rate limits (`workerThreads: false, cpus: 1`)
6. API routes packaged as serverless functions

**Build time considerations:**
- Build fetches live data from AniList for each season page
- Rate limiting protection is built into the fetch client
- Expect longer build times (~5-10 minutes) due to single-threaded SSG

---

## Project Structure for Development

### Adding a New Page

1. Create folder under `app/` following Next.js App Router conventions
2. Add `page.tsx` (server component) for data fetching
3. Add `Boundary.tsx` (client component) if interactivity needed
4. Update `next.config.js` if redirects needed

### Adding a New Component

1. Place in appropriate feature folder under `components/`
2. Use `"use client"` directive if the component needs browser APIs
3. Follow existing patterns: PascalCase filenames, TypeScript
4. Import via `@/components/...` path alias

### Adding a New API Route

1. Create `route.ts` under `app/api/<endpoint>/`
2. Export named functions: `GET`, `POST`, `DELETE`, etc.
3. Use `getServerSession()` for protected routes
4. Use `dbConnect()` before MongoDB operations

### Modifying Database Schema

1. Edit the Mongoose schema in `server/mongodb/models/`
2. No formal migrations — Mongoose handles schema evolution
3. Existing documents will have new fields as `undefined` until updated
4. Consider default values for backward compatibility

---

## Path Aliases

```json
{
  "@/*": "./*"
}
```

All imports can use `@/` to reference the project root:
```typescript
import { NavBar } from "@/components/common/NavBar";
import { dbConnect } from "@/server/mongodb/lib/dbConnect";
```

---

## Key Development Patterns

### Server/Client Boundary

```
page.tsx (Server)     → Fetches data, no interactivity
  └── Boundary.tsx (Client) → "use client", receives data as props
        └── Feature Component → Interactive UI, hooks, state
```

### Optimistic Updates

```typescript
// In AnimeInfoGrid.tsx
mutate(key, updatedData, { populateCache: true, revalidate: false });
toast.success("Added to list!");
// API call happens, SWR revalidates on next interval
```

### Rate-Limited API Calls

```typescript
// getAniListData.ts checks x-ratelimit-remaining header
if (remaining < 20) {
  await sleep(1500); // Auto-throttle
}
```

---

## Testing

**Current status:** No automated test suite configured.

**Recommended setup for future:**
- Jest + React Testing Library for component tests
- MSW (Mock Service Worker) for API mocking
- Playwright/Cypress for E2E tests

---

## Deployment

### Vercel (Production)

1. Connect repository to Vercel
2. Set all environment variables in Vercel dashboard
3. Push to main branch — auto-deploys
4. Vercel handles serverless functions, CDN, SSL

### Manual Build Verification

```bash
npm run build
npm start
# Verify at http://localhost:3000
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection fails | Check `MONGODB_URI` in `.env.local` |
| OAuth callback error | Verify callback URLs match provider settings |
| Build rate limiting | Build is single-threaded by design; wait and retry |
| Hydration mismatch | Wrap dynamic content in `HydrationProvider` check |
| Hot reload model error | Normal — try-catch in model definitions handles this |
| Tailwind styles missing | Run `npm run buildtw` or use `npm run tw:dev` |
