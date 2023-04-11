import { ReactNode } from "react";
import PageBase from "../../../components/animev3/PageBase";
import { getAniListData } from "../../../components/animev3/utils/getAniListData";

interface PageBaseProps {
  data?: any;
  year?: any;
  season?: any;
  params?: any;
  children?: ReactNode;
}

export default async function Boundary({ year, season }: PageBaseProps) {
  const { data = {} } =
    (await getAniListData({
      page: 1,
      year: year,
      season: season,
      timeout: 5000,
      enableLogs: false,
    })) || {};
  const obj = { year: year, season: season };

  return <PageBase year={year} params={obj} data={data} />;
}
