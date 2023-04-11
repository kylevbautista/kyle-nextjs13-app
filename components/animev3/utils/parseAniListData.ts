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
