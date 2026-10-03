# Screenshot check (signed-in pages, no OAuth, no real data)

The list pages need a session and a list. Run everything against a **throwaway in-memory
MongoDB**: the app's `MONGODB_URI` comes from the environment, which beats `.env.local`, so
the real database is never touched. Before clicking anything that writes, confirm the server
really uses the throwaway database: a seeded user id must return 200, which only that database
can do.

Work in the session scratchpad, never in the repo (these files would be linted and committed):

```bash
cd <scratchpad>/e2e && npm init -y && npm i playwright mongodb-memory-server mongodb@6
# Playwright must match a browser build in ~/.cache/ms-playwright (see node_modules/playwright-core/browsers.json).
node seed.mjs &            # in-memory mongod on :27999 + users/sessions; writes seed.json
cd <repo> && MONGODB_URI=mongodb://127.0.0.1:27999/kyle NEXTAUTH_URL=http://localhost:3100 \
  NEXTAUTH_SECRET=screenshot-only npx next dev -p 3100 &
node views.mjs list-phone owner /user/OWNER 390 860 0 760   # viewport shots at scroll offsets
```

Session cookies: `next-auth.session-token=owner` (the list owner), `visitor` (a different
signed-in user), `empty` (an owner with an empty list); with no cookie you get a signed-out
visitor. Check 1440, 820 and 390 px wide. Full-page shots of tall phone pages come out tiny,
so use viewport shots at scroll offsets (`views.mjs`). In headless WSL Chromium the `《》`
brackets and the nav's カイル show as boxes (no CJK font); real browsers render them.

The first request to each API route compiles it in `next dev` (about 1 s), so wait for a
`PATCH … 200` in the dev log before judging a click.

## seed.mjs

Pulls real airing and finished shows from AniList in one request, so covers, colors and
countdowns are real.

```js
// Throwaway DB for screenshots: in-memory mongod + one user with a realistic list.
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, ObjectId } from "mongodb";
import { writeFileSync } from "node:fs";

const FIELDS = `
  description coverImage { extraLarge large medium color } id idMal season seasonYear format
  title { romaji english native } studios(isMain: true) { nodes { name } }
  startDate { year month day } externalLinks { id url site } status episodes duration source genres
  averageScore popularity
  upcomingEpisode: nextAiringEpisode { id episode timeUntilAiring mediaId }
  upComingAirDate: airingSchedule(notYetAired: true, page: 1, perPage: 1) { episode: nodes { airingAt timeUntilAiring episode } }
  firstEpisode: airingSchedule(notYetAired: false, page: 1, perPage: 1) { episode: nodes { airingAt episode } }`;

const query = `query {
  airing: Page(page: 1, perPage: 14) { media(type: ANIME, status: RELEASING, isAdult: false, sort: POPULARITY_DESC, format_in: [TV]) { ${FIELDS} } }
  done: Page(page: 1, perPage: 6) { media(type: ANIME, status: FINISHED, isAdult: false, sort: POPULARITY_DESC, format: TV) { ${FIELDS} } }
}`;
const res = await fetch("https://graphql.anilist.co", {
  method: "POST",
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ query }),
});
const json = await res.json();
if (!json.data) throw new Error(JSON.stringify(json).slice(0, 500));
const airing = json.data.airing.media.filter((m) => m.upcomingEpisode);
const done = json.data.done.media;

const day = (y, m, d) => Date.UTC(y, m - 1, d);
const statuses = ["watching", "watching", "watching", "planning", "watching", "paused", "watching", "planning", "watching", "dropped", "watching", "planning"];
const following = [
  ...airing.slice(0, 12).map((m, i) => {
    const listType = statuses[i] ?? "watching";
    const aired = Math.max(0, (m.upcomingEpisode?.episode ?? 1) - 1);
    const progress = listType === "planning" ? 0 : Math.max(0, aired - (i % 3));
    return {
      ...m,
      userData: {
        listType,
        episodeProgressNumber: progress,
        startDate: listType === "planning" ? null : day(2026, 7, 4 + i),
        finishDate: null,
        score: i % 4 === 0 ? 8.5 : i % 4 === 1 ? 9 : null,
      },
    };
  }),
  ...done.slice(0, 5).map((m, i) => ({
    ...m,
    userData: {
      listType: "completed",
      episodeProgressNumber: m.episodes ?? 12,
      startDate: day(2025, 1 + i, 3),
      finishDate: day(2025, 3 + i, 20),
      score: [10, 9.5, 8, 7.5, 9][i],
    },
  })),
];

const mongod = await MongoMemoryServer.create({ instance: { port: 27999, dbName: "kyle" } });
const uri = mongod.getUri("kyle");
const client = await MongoClient.connect(uri);
const db = client.db("kyle");
const ownerId = new ObjectId("65f000000000000000000001");
const visitorId = new ObjectId("65f000000000000000000002");
const emptyId = new ObjectId("65f000000000000000000003");
const now = Date.now();
await db.collection("users").insertMany([
  { _id: ownerId, name: "Kyle Bautista", email: "owner@example.test", image: null, emailVerified: null, following, listRefreshedAt: now + 3600_000 },
  { _id: visitorId, name: "Vera Visitor", email: "visitor@example.test", image: null, emailVerified: null, following: [], listRefreshedAt: now + 3600_000 },
  { _id: emptyId, name: "Eli Empty", email: "empty@example.test", image: null, emailVerified: null, following: [], listRefreshedAt: now + 3600_000 },
]);
const expires = new Date(now + 7 * 864e5);
await db.collection("sessions").insertMany([
  { sessionToken: "owner", userId: ownerId, expires },
  { sessionToken: "visitor", userId: visitorId, expires },
  { sessionToken: "empty", userId: emptyId, expires },
]);
writeFileSync("seed.json", JSON.stringify({ uri, ownerId: ownerId.toString(), visitorId: visitorId.toString(), emptyId: emptyId.toString(), count: following.length }));
console.log("ready", uri, following.length);
process.on("SIGTERM", async () => { await client.close(); await mongod.stop(); process.exit(0); });
setInterval(() => {}, 1 << 30);
```

## views.mjs

```js
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const seed = JSON.parse(readFileSync("seed.json", "utf8"));
const [,, name, token, path, width, height, ...scrolls] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: Number(width), height: Number(height) } });
await ctx.addCookies([{ name: "next-auth.session-token", value: token, url: "http://localhost:3100" }]);
const p = await ctx.newPage();
p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await p.goto("http://localhost:3100" + path.replace("OWNER", seed.ownerId), { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
for (const [i, y] of scrolls.entries()) {
  await p.evaluate((y) => window.scrollTo(0, y), Number(y));
  await p.waitForTimeout(700);
  await p.screenshot({ path: `shots/${name}-${i}.png` });
}
await b.close();
```

Stop both background processes when you're done.

## AniList states (errors, rate limits, loading)

For pages that call AniList from the server (/search), run a small caching stub on :4100 and
start the app with `GRAPHQL_ANILIST=http://localhost:4100 NEXT_PUBLIC_GRAPHQL_ANILIST=http://localhost:4100`.
The stub forwards each new request body to AniList once (one at a time, ~0.7 s apart), caches the
response on disk, and fakes the hard states by search term: e.g. `"ratelimit test"` → 429 with
`Retry-After: 30`, `"error test"` → 500, `"slow test"` → real results after a delay (pending
states). Point `seed.mjs` at the stub too, so seeding doesn't spend the budget twice.

Two Playwright notes: `waitUntil: "networkidle"` can hang after a full-document navigation from one
`/search` URL to another (Next leaves duplicate prefetch bodies unread; real requests are fine), so
use `"load"` plus a short wait there; and `next dev` neither prefetches nor shows production
streaming, so re-check budgets, titles and no-JS on `next build && next start`. Kill the servers by
PID (`ss -ltnp`), never `pkill -f` (it matches your own shell).
