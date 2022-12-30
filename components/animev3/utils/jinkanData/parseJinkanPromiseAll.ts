export const parseJinkanPromiseAll = (dataArray: any) => {
  const aggregatedData = dataArray.map((info: any) => {
    return info.data;
  });
  const agregatedPagination = dataArray.map((info: any) => {
    return info.pagination;
  });
  const data = aggregatedData.flat() || [];
  const pagination = agregatedPagination[agregatedPagination.length - 1] || {};
  return {
    data,
    pagination,
  };
};
