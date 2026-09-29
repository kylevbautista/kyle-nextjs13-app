"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINK_CLASS =
  "flex h-16 shrink-0 items-center rounded-2xl px-2 text-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#95ccff] aria-[current=page]:text-[#95ccff] aria-[current=page]:hover:text-white sm:px-4 sm:text-base";

interface NavLinkProps {
  href: string;
  /** How the current pathname marks this link active: exact match, or `href` and anything below it. */
  match?: "exact" | "prefix" | "none";
  className?: string;
  children: ReactNode;
}

export function NavLink({ href, match = "prefix", className = "", children }: NavLinkProps) {
  const pathname = usePathname() ?? "";
  const active =
    match === "exact"
      ? pathname === href
      : match === "prefix" && (pathname === href || pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${NAV_LINK_CLASS} ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * Anime section links. "/anime" resolves to the current season on each
 * request, so these never carry a build-time date.
 */
export function AnimeBar() {
  return (
    <>
      <NavLink href="/anime" match="none" className="font-semibold">
        カイル
      </NavLink>
      {/* On phones the brand link (same destination) stands in for "Seasons". */}
      <NavLink href="/anime" className="hidden sm:flex">
        Seasons
      </NavLink>
      <NavLink href="/topanime">Top Anime</NavLink>
    </>
  );
}
