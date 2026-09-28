import type { MetadataRoute } from "next";

/**
 * Crawl the public catalog only. Search results each cost an AniList request
 * (~30/min budget), and list pages are personal pages shared by link.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/search", "/user/", "/mylist/", "/api/", "/auth"],
    },
  };
}
