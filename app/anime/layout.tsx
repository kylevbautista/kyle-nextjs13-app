import { HeaderSelectorWrapper } from "../../components/animev3/layoutSelector/HeaderSelectorWrapper";
import { HeaderProvider } from "../../components/animev3/layoutSelector/HeaderProvider";

export default async function AnimeRouteLayout(
  props: {
    params: Promise<any>;
    children: React.ReactNode;
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

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
