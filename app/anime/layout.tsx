import { HeaderSelectorWrapper } from "@/components/animev3/layoutSelector/HeaderSelectorWrapper";
import { HeaderProvider } from "@/components/animev3/layoutSelector/HeaderProvider";

export default function AnimeRouteLayout({ children }: { children: React.ReactNode }) {
  // The header's season math uses the server's clock so its markup hydrates cleanly.
  const renderedAt = new Date().getTime();

  return (
    <div id="animev3-route">
      <HeaderProvider>
        <HeaderSelectorWrapper renderedAt={renderedAt} />
        {children}
      </HeaderProvider>
    </div>
  );
}
