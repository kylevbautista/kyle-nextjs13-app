"use client";
import { useEffect } from "react";

/**
 * Renders nothing; keeps document.title on the search shown. Next 16.3 keeps
 * the <title> of a bare /search loaded in full (the home) through later
 * client navigations to /search?q=… (also before this page's redesign), so
 * the tab, history and Next's route announcer would say "Search anime".
 * Outside the page's Suspense boundaries, so it runs in the navigation's
 * commit, before the announcer reads the title.
 */
export default function SearchTitle({ title }: { title: string }) {
  useEffect(() => {
    if (document.title !== title) document.title = title;
  }, [title]);
  return null;
}
