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
    <div id="my-list" className="mx-auto min-w-0 w-full max-w-screen-2xl px-4 pb-8 md:px-6">
      {children}
    </div>
  );
}
