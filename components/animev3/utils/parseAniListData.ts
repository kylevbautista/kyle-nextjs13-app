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
  const {
    winter,
    spring,
    summer,
    fall,
  }: {
    winter: graphQLPageType;
    spring: graphQLPageType;
    summer: graphQLPageType;
    fall: graphQLPageType;
  } = data || {};

  interface parsedDataType {
    popularity: any[];
    countdown: any[];
  }

  const parsedData: parsedDataType = {
    popularity: [],
    countdown: [],
  };

  let parsedDataTest: any = [];
  if (season === "winter") {
    const winterData = winter?.media || [];
    parsedData.popularity = winterData;
    parsedData.countdown = [...winterData]?.sort(compareFnCountDown);
    parsedDataTest = byCount
      ? [...winterData]?.sort(compareFnCountDown)
      : winterData;
  }
  if (season === "spring") {
    const fallData = fall?.media || [];
    parsedData.popularity = fallData;
    parsedData.countdown = [...fallData]?.sort(compareFnCountDown);
    parsedDataTest = byCount
      ? [...fallData]?.sort(compareFnCountDown)
      : fallData;
  }
  if (season === "summer") {
    let summerData = summer?.media || [];
    parsedData.popularity = summerData;
    parsedData.countdown = [...summerData]?.sort(compareFnCountDown);
    parsedDataTest = byCount
      ? [...summerData]?.sort(compareFnCountDown)
      : summerData;
  }
  if (season === "fall") {
    let fallData = fall?.media || [];
    parsedData.popularity = fallData;
    parsedData.countdown = [...fallData]?.sort(compareFnCountDown);
    parsedDataTest = byCount
      ? [...fallData]?.sort(compareFnCountDown)
      : fallData;
  }

  return {
    parsedData,
    parsedDataTest,
  };
};
