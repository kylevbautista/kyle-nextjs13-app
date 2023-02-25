interface graphQLPageType {
  media: [];
}

export const compareFnCountDown = (a: any, b: any) => {
  let tempA = Number.MAX_SAFE_INTEGER;
  let tempB = Number.MAX_SAFE_INTEGER;
  if (a.upcomingEpisode?.timeUntilAiring) {
    tempA = a.upcomingEpisode?.timeUntilAiring;
  }
  if (b.upcomingEpisode?.timeUntilAiring) {
    tempB = b.upcomingEpisode?.timeUntilAiring;
  }

  if (tempA < tempB) {
    return -1;
  }
  if (tempA > tempB) {
    return 1;
  }
  return 0;
};

export const parseAniListData = ({
  data,
  year,
  season,
  byCount = true,
  byPopularity = false,
}: any) => {
  const { page }: any = data || {};

  interface parsedDataType {
    popularity: any[];
    countdown: any[];
  }

  const parsedData: parsedDataType = {
    popularity: [],
    countdown: [],
  };

  let parsedDataTest: any = [];
  if (season !== "") {
    const pageData = page?.media || [];
    parsedData.popularity = pageData;
    parsedData.countdown = [...pageData]?.sort(compareFnCountDown);
    parsedDataTest = byCount
      ? [...pageData]?.sort(compareFnCountDown)
      : pageData;
  }

  return {
    parsedData,
    parsedDataTest,
  };
};
