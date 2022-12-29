"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function FixLoading() {
  const path: any = usePathname();
  const router = useRouter();

  useEffect(() => {
    const timeouts = [100, 500, 1000, 2000, 3000, 5000, 10000].map((t) =>
      setTimeout(() => router.replace(path), t)
    );
    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [path]);

  return <></>;
}
