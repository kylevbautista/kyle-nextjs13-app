import { getTopAnimeJinkanInitalPages } from "../../components/animev3/utils/jinkanData/getTopAnimeJinkan";
import { Test } from "./Test";

const Boundary = async () => {
  const dataArray =
    (await getTopAnimeJinkanInitalPages({ pages: 2, enableLogs: false })) || [];
  const aggregatedData = dataArray.map((info) => {
    return info.data;
  });
  const agregatedPagination = dataArray.map((info) => {
    return info.pagination;
  });
  const data = aggregatedData.flat() || [];
  const pagination = agregatedPagination[agregatedPagination.length - 1] || {};
  return (
    <div>
      <Test data={data} pagination={pagination} />
    </div>
  );
};

export { Boundary };
