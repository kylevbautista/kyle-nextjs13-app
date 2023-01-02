import { HeaderSelectorWrapper } from "../../components/animev3/layoutSelector/HeaderSelectorWrapper";
import { HeaderProvider } from "../../components/animev3/layoutSelector/HeaderProvider";

export default function AnimeRouteLayout({
  params,
  children,
}: {
  params: any;
  children: React.ReactNode;
}) {
  const { anime = [] } = params;
  const [year = "", season = ""] = anime;
  return (
    <div id="animev3-route">
      <HeaderProvider>
        <HeaderSelectorWrapper year={year} season={season} />
        {children}
      </HeaderProvider>
    </div>
  );
}
