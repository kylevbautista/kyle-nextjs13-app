"use client";

import React, { useContext } from "react";
import Link from "next/link";
import { RouterChangeContext } from "./RouterChangeProvider";

export const LinkRouterWrapper = ({
  href,
  className,
  children,
}: React.PropsWithChildren<{ href: string; className: string }>) => {
  const startChange = useContext(RouterChangeContext);
  const useLink = href && href.startsWith("/");

  if (useLink)
    return (
      <Link
        href={href}
        onClick={() => {
          const { pathname, search, hash } = window.location;
          if (href !== pathname + search + hash) {
            startChange();
          }
        }}
        className={className}
      >
        {children}
      </Link>
    );
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
};
