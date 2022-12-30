import {
  getTopAnimeJinkanInitalPages,
  getTopAnimeJinkan,
} from "../../components/animev3/utils/jinkanData/getTopAnimeJinkan";
import { parseJinkanPromiseAll } from "../../components/animev3/utils/jinkanData/parseJinkanPromiseAll";
import { Test } from "./Test";

const Boundary = async () => {
  // const dataArray =
  //   (await getTopAnimeJinkanInitalPages({ pages: 2, enableLogs: false })) || [];
  // const { data, pagination } = parseJinkanPromiseAll(dataArray);
  const { data, pagination } = await getTopAnimeJinkan({ page: 1 });
  return (
    <div className="w-full laptop2:w-fit">
      <Test data={data} pagination={pagination} />
    </div>
  );
};

export { Boundary };
