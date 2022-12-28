import HeaderSelector from "../../components/anime/HeaderSelector";
import HeaderSelectorWrapper from "../../components/anime/HeaderSelectorWrapper";
import { HeaderProvider } from "../../components/anime/HeaderProvider";

export default function MyListLayout({
  params,
  children,
}: {
  params: any;
  children: React.ReactNode;
}) {
  return <div id="my-list">{children}</div>;
}
