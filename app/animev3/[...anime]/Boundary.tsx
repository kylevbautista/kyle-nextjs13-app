import { ReactNode } from "react";
import PageBase from "../../../components/animev3/PageBase";
import { getAniListDataByYear } from "../../../components/animev3/utils/getAniListDataByYear";

interface PageBaseProps {
  data?: any;
  year?: any;
  season?: any;
  params?: any;
  children?: ReactNode;
}

export default async function Boundary({ year, season }: PageBaseProps) {
  // const { data = {} } =
  //   (await getAniListDataByYear({
  //     year: year,
  //     timeout: 5000,
  //     enableLogs: false,
  //   })) || {};
  const data = await getAniListDataByYear({
    year: year,
    timeout: 5000,
    enableLogs: false,
  });
  const obj = { year: year, season: season };

  return <PageBase year={year} params={obj} data={data?.data} />;
}
