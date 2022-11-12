import PageBase from "./components/PageBase";
import { getSeasonNow } from "../jinkan/seasonNow";

export default async function Home() {
  const data = await getSeasonNow();
  return <PageBase data={data} />;
}
