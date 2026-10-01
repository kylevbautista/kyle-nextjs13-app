import type { Metadata } from "next";
import { requireListOwner } from "@/server/lib/listRoute";
import { airingSchedulePath } from "@/lib/routes";

export const metadata: Metadata = {
  metadataBase: new URL("https://kylevb.com"),
  title: "Airing Schedule",
  description: "What's airing from an anime list, with live episode countdowns.",
  openGraph: {
    title: "Airing Schedule",
    description: "What's airing from an anime list, with live episode countdowns.",
    images: [{ url: "/rimuru.png", width: 200, height: 141 }],
  },
};

/**
 * Validates the list URL here, outside loading.tsx, so unknown lists get a
 * real 404 and legacy/non-canonical URLs a real 307 (see server/lib/listRoute.ts).
 */
export default async function AiringScheduleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ user?: string[] }>;
}) {
  const { user } = await params;
  await requireListOwner(user, airingSchedulePath);

  return (
    // Full width: the page draws its own night-sky banner and content column.
    <main id="airing-schedule" className="min-w-0 w-full overflow-x-clip pb-8 [contain:inline-size]">
      {children}
    </main>
  );
}
