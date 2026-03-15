# API Contracts

**Generated:** 2026-03-15 | **Scan Level:** Exhaustive

---

## Overview

All API endpoints are implemented as Next.js App Router API routes under `app/api/`. Authentication is handled by NextAuth.js with MongoDB session storage. Protected endpoints require an active session (checked via `getServerSession()`).

---

## Authentication Endpoints

### `GET/POST /api/auth/[...nextauth]`

**Handler:** NextAuth catch-all route
**Providers:** GitHub, Twitter (v2.0), Google
**Session Storage:** MongoDB via `@next-auth/mongodb-adapter`
**Custom Callback:** Attaches `session.objectId` (MongoDB user `_id`) to session object

---

## Watchlist Endpoints

### `POST /api/anime-list` — Add Anime to Watchlist

**Auth Required:** Yes
**Request Body:**
```json
{
  "animeData": {
    "id": 12345,
    "title": { "romaji": "...", "english": "..." },
    "coverImage": { "large": "..." },
    ...
  }
}
```
**Logic:**
1. Gets session via `getServerSession()`
2. Checks for duplicates using `$elemMatch` on `following` array
3. Uses `$addToSet` with `setDefaultsOnInsert` to prevent duplicates
4. Returns status

**Responses:**
- `200` — `"Successfully Added to List"`
- `200` — `"Already In List"` (duplicate detected)
- `401` — Unauthorized (no session)

---

### `DELETE /api/anime-list` — Remove Anime from Watchlist

**Auth Required:** Yes
**Request Body:**
```json
{
  "animeId": 12345
}
```
**Logic:**
1. Gets session via `getServerSession()`
2. Uses `$pull` operator to remove entry from `following` array by ID

**Responses:**
- `200` — `"Successfully Removed From List"`
- `200` — `"Did Not Remove"` (not found)
- `401` — Unauthorized

---

### `GET /api/anime-list/user/[userParam]` — Get User's Anime List

**Auth Required:** No (public endpoint, user param is base64url-encoded email)
**URL Params:**
- `userParam` — Base64url-encoded user email

**Logic:**
1. Decodes base64url parameter to get email
2. Queries MongoDB for user by email
3. Returns `following` array (full anime list with user progress)

**Response:**
```json
{
  "following": [
    {
      "id": 12345,
      "title": { "romaji": "...", "english": "..." },
      "userData": { "listType": "Watching", "episodeProgress": 5, "score": 8 },
      ...
    }
  ]
}
```

---

### `GET /api/anime-list/[animeId]/user-data` — Get User Progress for Specific Anime

**Auth Required:** Yes
**URL Params:**
- `animeId` — AniList anime ID

**Logic:**
1. Gets session
2. Queries user's `following` array for matching anime ID
3. Returns user's progress data for that specific anime

**Response:**
```json
{
  "userData": {
    "listType": "Watching",
    "episodeProgress": 5,
    "score": 8,
    "startDate": "2026-01-15",
    "finishDate": null
  }
}
```

---

### `POST /api/anime-list/bulk` — Bulk Update Operations

**Auth Required:** Yes
**Request Body:**
```json
{
  "operations": [
    { "animeId": 12345, "update": { "listType": "Completed", "score": 9 } },
    { "animeId": 67890, "update": { "episodeProgress": 12 } }
  ]
}
```
**Logic:** Performs batch MongoDB updates on user's `following` array entries.

---

## External API Integration

### AniList GraphQL API

**Endpoint:** `https://graphql.anilist.co`
**Client:** `components/animev3/utils/getAniListData.ts`

**Query:** `allCurrAnimeTag`
- Paginates: 50 items per page
- Filters: season, year, `isAdult: false`, excludes `TV_SHORT` and `ONA`
- Sorts: `POPULARITY_DESC`
- Returns: Full anime data including upcoming episode timestamps, airing schedules, studios, genres, external links

**Rate Limiting Protection:**
- Monitors `x-ratelimit-remaining` response header
- Auto-sleeps 1.5 seconds when remaining calls < 20
- Request timeout: 5000ms (configurable via `fetchWithTimeout`)

---

## Authentication Flow

```
User → Sign In Page → OAuth Provider (GitHub/Twitter/Google)
  → Callback → NextAuth Handler → MongoDB Session Created
  → Session includes: { user: { name, email, image }, objectId: "<MongoDB _id>" }
  → All protected API calls check getServerSession()
```
