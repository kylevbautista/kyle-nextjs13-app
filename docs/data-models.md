# Data Models

**Generated:** 2026-03-15 | **Scan Level:** Exhaustive

---

## Overview

Data is stored in **MongoDB** via **Mongoose 6.8.1**. The database has two primary models: **User** and **AnimeInfo**. Anime data is embedded (denormalized) within each user's document as a `following` array, which avoids joins and allows fast reads for individual user watchlists.

---

## User Model

**File:** `server/mongodb/models/User/index.ts`
**Collection:** `users`

### Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | String | No | — | Display name (from OAuth) |
| `email` | String | No | — | Email address (from OAuth) |
| `image` | String | No | — | Profile image URL |
| `emailVerified` | String | No | — | Email verification status |
| `following` | [AnimeInfo] | No | `[]` | Embedded array of tracked anime |

### Notes
- NextAuth manages user creation via the MongoDB adapter
- The `following` array contains full `AnimeInfo` subdocuments (embedded, not referenced)
- Duplicate model definition is handled with try-catch for hot reload safety
- Compound lookups use `$elemMatch` on the `following` array

---

## AnimeInfo Model (Embedded Subdocument)

**File:** `server/mongodb/models/AnimeInfo/index.ts`
**Used as:** Embedded subdocument within `User.following[]`

### Top-Level Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | Number | — | AniList anime ID |
| `description` | String | `""` | HTML synopsis |
| `episodes` | Number | `0` | Total episode count |
| `duration` | Number | `0` | Episode duration (minutes) |
| `genres` | [String] | `[]` | Genre list |
| `season` | String | `""` | Airing season (WINTER, SPRING, SUMMER, FALL) |
| `seasonYear` | Number | `0` | Airing year |
| `format` | String | `""` | Media format (TV, OVA, MOVIE, etc.) |
| `status` | String | `""` | Airing status (RELEASING, FINISHED, etc.) |
| `source` | String | `""` | Source material type |
| `popularity` | Number | `0` | Popularity ranking |
| `averageScore` | Number | `0` | Average user score |
| `isAdult` | Boolean | `false` | Adult content flag |
| `siteUrl` | String | `""` | AniList page URL |
| `bannerImage` | String | `""` | Banner image URL |

### Nested Objects

#### `title` (subdocument, `_id: false`)
| Field | Type | Default |
|-------|------|---------|
| `romaji` | String | `""` |
| `english` | String | `""` |
| `native` | String | `""` |

#### `coverImage` (subdocument, `_id: false`)
| Field | Type | Default |
|-------|------|---------|
| `extraLarge` | String | `""` |
| `large` | String | `""` |
| `medium` | String | `""` |
| `color` | String | `""` |

#### `studios` (subdocument, `_id: false`)
| Field | Type | Default |
|-------|------|---------|
| `nodes` | [{ name: String }] | `[]` |

#### `externalLinks` (array of subdocuments, `_id: false`)
| Field | Type | Default |
|-------|------|---------|
| `url` | String | `""` |
| `site` | String | `""` |
| `icon` | String | `""` |
| `color` | String | `""` |

#### `upcomingEpisode` (subdocument, `_id: false`)
| Field | Type | Default |
|-------|------|---------|
| `airingAt` | Number | `0` |
| `timeUntilAiring` | Number | `0` |
| `episode` | Number | `0` |

#### `upComingAirDate` (subdocument, `_id: false`)
| Field | Type | Default |
|-------|------|---------|
| `nodes` | [{ airingAt: Number, timeUntilAiring: Number, episode: Number }] | `[]` |

#### `firstEpisode` (subdocument, `_id: false`)
| Field | Type | Default |
|-------|------|---------|
| `nodes` | [{ airingAt: Number, timeUntilAiring: Number, episode: Number }] | `[]` |

#### `sourceInfo` (subdocument, `_id: false`)
| Field | Type | Default |
|-------|------|---------|
| `siteUrl` | String | `""` |
| `type` | String | `""` |

#### `userData` (subdocument, `_id: false`)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `listType` | String | `""` | Watching, Completed, Paused, Dropped |
| `episodeProgress` | Number | `0` | Episodes watched |
| `score` | Number | `0` | User's rating (0-10) |
| `startDate` | String | `""` | When user started watching |
| `finishDate` | String | `""` | When user finished watching |

---

## Data Architecture Diagram

```
MongoDB
└── users (collection)
    └── User Document
        ├── _id: ObjectId
        ├── name: String
        ├── email: String
        ├── image: String
        ├── emailVerified: String
        ├── following: [                    ← Embedded array (denormalized)
        │   └── AnimeInfo
        │       ├── id: Number (AniList ID)
        │       ├── title: { romaji, english, native }
        │       ├── coverImage: { extraLarge, large, medium, color }
        │       ├── studios: { nodes: [{ name }] }
        │       ├── genres: [String]
        │       ├── episodes, duration, season, seasonYear
        │       ├── status, format, source, popularity, averageScore
        │       ├── externalLinks: [{ url, site, icon, color }]
        │       ├── upcomingEpisode: { airingAt, timeUntilAiring, episode }
        │       ├── upComingAirDate: { nodes: [...] }
        │       ├── firstEpisode: { nodes: [...] }
        │       ├── sourceInfo: { siteUrl, type }
        │       └── userData: { listType, episodeProgress, score, startDate, finishDate }
        │   ]
        └── (NextAuth session fields managed by adapter)

└── sessions (collection) — managed by NextAuth MongoDB adapter
└── accounts (collection) — managed by NextAuth MongoDB adapter
```

---

## Design Decisions

1. **Embedded over Referenced:** Anime data is embedded within user documents rather than referenced. This optimizes for read-heavy watchlist operations at the cost of data duplication.
2. **`_id: false` on subdocuments:** Prevents Mongoose from generating ObjectIds for nested objects, reducing storage overhead.
3. **Try-catch model registration:** Handles Next.js hot-reload module re-execution gracefully by catching duplicate model registration errors.
4. **No migrations:** Schema is flexible (MongoDB); changes are applied via Mongoose schema updates without formal migration files.
