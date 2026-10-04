import { requireListOwner } from "@/server/lib/listRoute";
import { myListPath } from "@/lib/routes";

/**
 * Validates the list URL here, outside loading.tsx, so unknown lists get a
 * real 404 and legacy/non-canonical URLs a real 307 (see server/lib/listRoute.ts).
 */
export default async function MyListLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ user?: string[] }>;
}) {
  const { user } = await params;
  await requireListOwner(user, myListPath);

  return (
    // Full width: the page draws its own night-sky banner and content column. The landmark lives here (as on
    // /mylist), so the loading skeleton and the list share one <main>: the skip link lands on it in both.
    <main id="my-list" className="min-w-0 w-full overflow-x-clip">
      {children}
    </main>
  );
}
