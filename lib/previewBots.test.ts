import { describe, expect, it } from "vitest";
import { ROBOTS_PREVIEW_BOTS, isPreviewBot } from "./previewBots";

describe("isPreviewBot", () => {
  it("knows the unfurlers", () => {
    for (const ua of [
      "Twitterbot/1.0",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0",
      "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
      "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
      "TelegramBot (like TwitterBot)",
      "WhatsApp/2.23.20.0 A",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "http.rb/5.1.1 (Mastodon/4.2.0; +https://mastodon.social/)",
      "Mozilla/5.0 (compatible; Bluesky Cardyb/1.1; +mailto:support@bsky.app)",
    ]) {
      expect(isPreviewBot(ua), ua).toBe(true);
    }
  });

  it("leaves browsers alone", () => {
    for (const ua of [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "",
      null,
      undefined,
    ]) {
      expect(isPreviewBot(ua)).toBe(false);
    }
  });

  it("names exactly the robots group's tokens", () => {
    expect([...ROBOTS_PREVIEW_BOTS]).toEqual(["Twitterbot", "facebookexternalhit", "Discordbot", "LinkedInBot", "TelegramBot", "WhatsApp"]);
  });
});
