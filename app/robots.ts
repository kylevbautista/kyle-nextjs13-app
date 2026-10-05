import type { MetadataRoute } from "next";
import { ROBOTS_PREVIEW_BOTS } from "@/lib/previewBots";

/**
 * Search engines crawl the public catalog only. Search results each cost an
 * AniList request (~30/min budget), and list pages are personal pages shared
 * by link. They stay disallowed, not noindex: a search crawl of a list page
 * would start an AniList refresh (CLAUDE.md §5.5), and Telegram drops previews
 * of noindex pages.
 * Link-preview bots that honor robots.txt get their own group so a shared list
 * unfurls with its image (§5.8); their page reads start no refresh
 * (lib/previewBots.ts). A crawler obeys only its most specific group, so this
 * group repeats the other rules. (Added from the bots' docs, not measured
 * against them: drop the second group to keep list pages closed to every
 * crawler but Slack, which ignores robots.txt.)
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/search", "/user/", "/mylist/", "/api/", "/auth"] },
      { userAgent: [...ROBOTS_PREVIEW_BOTS], allow: "/", disallow: ["/search", "/api/", "/auth"] },
    ],
  };
}
