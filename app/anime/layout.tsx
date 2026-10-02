import { HeaderProvider } from "@/components/animev3/layoutSelector/HeaderProvider";

/**
 * The season pages' shell: full width (each page draws its own banner and
 * containers) and the sort / continuing-series context, which lives here so
 * it survives navigating between seasons.
 */
export default function AnimeRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="season-browser" className="min-w-0 w-full overflow-x-clip pb-8 text-white [contain:inline-size]">
      <HeaderProvider>{children}</HeaderProvider>
    </main>
  );
}
