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

export const parseAniListData = (data: any) => {
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
  const { media: winterByPopularity = [] } = winter || {};
  const { media: springByPopularity = [] } = spring || {};
  const { media: summerByPopularity = [] } = summer || {};
  const { media: fallByPopularity = [] } = fall || {};

  const winterByCountDown = [...winterByPopularity]?.sort(compareFnCountDown);
  const springByCountDown = [...springByPopularity]?.sort(compareFnCountDown);
  const summerByCountDown = [...summerByPopularity]?.sort(compareFnCountDown);
  const fallByCountDown = [...fallByPopularity]?.sort(compareFnCountDown);

  return {
    winterByPopularity,
    winterByCountDown,
    springByPopularity,
    springByCountDown,
    summerByPopularity,
    summerByCountDown,
    fallByPopularity,
    fallByCountDown,
  };
};
