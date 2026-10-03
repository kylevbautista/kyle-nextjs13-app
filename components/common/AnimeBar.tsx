"use client";
import type { FocusEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_CURRENT_MARK, NAV_LINK } from "@/components/theme/tokens";
import { isCurrentPath, type PathMatch } from "@/lib/routes";

interface NavLinkProps {
  href: string;
  /** How the current pathname marks this link active: exact match, or `href` and anything below it. */
  match?: PathMatch;
  className?: string;
  children: ReactNode;
}

/**
 * When the link strip overflows (large fonts, zoom), a focused link that is partly hidden scrolls
 * into the strip's view. Only the strip scrolls: scrollIntoView() could also move the page.
 */
function revealInStrip(event: FocusEvent<HTMLAnchorElement>) {
  const link = event.currentTarget;
  const strip = link.parentElement;
  if (!strip || strip.scrollWidth <= strip.clientWidth) return;
  const box = link.getBoundingClientRect();
  const view = strip.getBoundingClientRect();
  if (box.right > view.right) strip.scrollLeft += box.right - view.right;
  else if (box.left < view.left) strip.scrollLeft -= view.left - box.left;
}

export function NavLink({ href, match = "prefix", className = "", children }: NavLinkProps) {
  const pathname = usePathname() ?? "";
  const active = isCurrentPath(pathname, href, match);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onFocus={revealInStrip}
      className={`${NAV_LINK} ${className}`}
    >
      {children}
      {/* The current page's moonlit underline: shape, not just color (a border: forced colors keeps it). */}
      {active && <span aria-hidden="true" className={NAV_CURRENT_MARK} />}
    </Link>
  );
}

/**
 * Anime section links. "/anime" resolves to the current season on each
 * request, so these never carry a build-time date.
 */
export function AnimeBar({ brandMark }: { brandMark?: ReactNode }) {
  return (
    <>
      <NavLink href="/anime" match="none" className="font-semibold">
        {brandMark}
        カイル
        {/* On phones the brand link (same destination) stands in for "Seasons", and says so. */}
        <span className="sr-only sm:hidden"> Seasons</span>
      </NavLink>
      <NavLink href="/anime" className="hidden sm:flex">
        Seasons
      </NavLink>
      <NavLink href="/topanime">Top Anime</NavLink>
    </>
  );
}
