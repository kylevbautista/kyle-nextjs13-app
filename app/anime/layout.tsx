import HeaderSelector from "../../components/anime/HeaderSelector";
import HeaderSelectorWrapper from "../../components/anime/HeaderSelectorWrapper";
import { HeaderProvider } from "../../components/anime/HeaderProvider";

export default function AnimeRouteLayout({
  params,
  children,
}: {
  params: any;
  children: React.ReactNode;
}) {
  return (
    <div id="anime-route">
      <HeaderProvider>
        <HeaderSelectorWrapper />
        {children}
      </HeaderProvider>
    </div>
  );
}
