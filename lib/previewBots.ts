/**
 * Link-preview bots (CLAUDE.md §5.8): they fetch a shared page only to unfurl
 * it. The list pages skip the AniList refresh for them (§5.5), since they
 * would spend AniList budget on a page nobody reads, and app/robots.ts lets
 * the ones that honor robots.txt read list pages.
 */

/** Preview bots that honor robots.txt: app/robots.ts's second group names exactly these product tokens. */
export const ROBOTS_PREVIEW_BOTS = [
  "Twitterbot", // X; also in iMessage's on-device user agent
  "facebookexternalhit", // Facebook, Messenger, Instagram (and iMessage)
  "Discordbot",
  "LinkedInBot",
  "TelegramBot",
  "WhatsApp",
] as const;

/**
 * Preview fetchers that don't read robots.txt. Slack is official
 * (api.slack.com/robots). The Mastodon and Bluesky (Cardyb) tokens come from
 * community reports. A wrong or missing token only costs a refresh, so check
 * Vercel's logs.
 */
const OTHER_PREVIEW_BOTS = ["Slackbot", "Mastodon", "Cardyb"] as const;

const PREVIEW_BOT_RE = new RegExp([...ROBOTS_PREVIEW_BOTS, ...OTHER_PREVIEW_BOTS].join("|"), "i");

/** True for a link-preview bot's user agent: the page then reads stored list data only (no AniList refresh). */
export const isPreviewBot = (userAgent: string | null | undefined): boolean =>
  !!userAgent && PREVIEW_BOT_RE.test(userAgent);
