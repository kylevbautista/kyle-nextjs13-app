import type { ReactNode } from "react";
import { APP_CONTAINER } from "@/components/theme/tokens";

/**
 * Page chrome shared by page.tsx and error.tsx: the banner, then a content
 * grid (one column, or list + 22rem aside from 1024px). Children place
 * themselves in the grid explicitly. Hook-free.
 */
export default function TopAnimeShell({ banner, children }: { banner: ReactNode; children: ReactNode }) {
  return (
    <main id="top-anime" className="min-w-0 w-full overflow-x-clip pb-8 text-white">
      {banner}
      <div
        className={`${APP_CONTAINER} grid gap-8 [contain:inline-size] lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start`}
      >
        {children}
      </div>
    </main>
  );
}
