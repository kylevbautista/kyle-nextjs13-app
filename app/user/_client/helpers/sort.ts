import { unixTimeStampToWeekDay } from "@/components/animev3/utils/timeStampHelpers";

export const getSortedData = ({
  option = "Any",
  yearOption = 2023,
  seasonOption = "winter",
  dayOption = "all",
  listSorted = [],
}: any) => {
  const SeasonDayList = listSorted?.filter((anime: any) => {
    const startDate = anime?.startDate || {};
    const { day = 1, month = 1, year = 1 } = startDate;

    if (
      anime?.season?.toLowerCase() === seasonOption &&
      yearOption == year &&
      dayOption ==
        unixTimeStampToWeekDay(
          anime?.firstEpisode?.episode[0]?.airingAt
        )?.dayOfTheWeek.toLowerCase()
    ) {
      return anime;
    }
  });
  const SeasonAllList = listSorted?.filter((anime: any) => {
    const startDate = anime?.startDate || {};
    const { day = 1, month = 1, year = 1 } = startDate;

    if (anime?.season?.toLowerCase() === seasonOption && yearOption == year) {
      return anime;
    }
  });

  let data = listSorted;
  if (dayOption == "any") {
    data = SeasonAllList;
  } else {
    data = SeasonDayList;
  }
  return {
    data,
  };
};

export const getByDay = ({ data = [], dayOption = "all" }: any) => {
  const byDayList = data?.filter((anime: any) => {
    const startDate = anime?.startDate || {};
    const { day = 1, month = 1, year = 1 } = startDate;

    if (
      // anime?.season?.toLowerCase() === seasonOption &&
      // yearOption == year &&
      dayOption ===
      unixTimeStampToWeekDay(
        anime?.firstEpisode?.episode[0]?.airingAt
      )?.dayOfTheWeek.toLowerCase()
    ) {
      return anime;
    }
  });

  return byDayList;
};

export const getByYear = ({ data = [], yearOption = 0 }: any) => {
  const byYearList = data?.filter((anime: any) => {
    const startDate = anime?.startDate || {};
    const { day = 1, month = 1, year = 1 } = startDate;

    if (yearOption === year) {
      console.log(anime);
      return anime;
    }
  });

  return byYearList;
};

export const getBySeason = ({ data = [], seasonOption = "all" }: any) => {
  const bySeasonList = data?.filter((anime: any) => {
    if (anime?.season === seasonOption) {
      return anime;
    }
  });

  return bySeasonList;
};

export const getByReleaseStatus = ({
  data = [],
  statusOption = "all",
}: any) => {
  const byReleaseStatus = data?.filter((anime: any) => {
    if (anime?.status === statusOption) {
      return anime;
    }
  });

  return byReleaseStatus;
};

export const getByListType = ({ data = [], filterBy = null }: any) => {
  let all: any = [];
  let watching: any = [];
  let completed: any = [];
  let paused: any = [];
  let dropped: any = [];

  for (let i = 0; i < data.length; i++) {
    let item: any = data[i];
    if (item.userData.listType === "watching") {
      watching.push(item);
    }
    if (item.userData.listType === "completed") {
      completed.push(item);
    }
    if (item.userData.listType === "paused") {
      paused.push(item);
    }
    if (item.userData.listType === "dropped") {
      dropped.push(item);
    }
    all.push(item);
  }

  if (filterBy && filterBy.year !== 0) {
    all = getByYear({ data: all, yearOption: filterBy.year });
    watching = getByYear({ data: watching, yearOption: filterBy.year });
    completed = getByYear({ data: completed, yearOption: filterBy.year });
    paused = getByYear({ data: paused, yearOption: filterBy.year });
    dropped = getByYear({ data: dropped, yearOption: filterBy.year });
  }
  if (filterBy && filterBy.season !== "all") {
    all = getBySeason({ data: all, seasonOption: filterBy.season });
    watching = getBySeason({ data: watching, seasonOption: filterBy.season });
    completed = getBySeason({ data: completed, seasonOption: filterBy.season });
    paused = getBySeason({ data: paused, seasonOption: filterBy.season });
    dropped = getBySeason({ data: dropped, seasonOption: filterBy.season });
  }
  if (filterBy && filterBy.day !== "all") {
    all = getByDay({ data: all, dayOption: filterBy.day });
    watching = getByDay({ data: watching, dayOption: filterBy.day });
    completed = getByDay({ data: completed, dayOption: filterBy.day });
    paused = getByDay({ data: paused, dayOption: filterBy.day });
    dropped = getByDay({ data: dropped, dayOption: filterBy.day });
  }
  if (filterBy && filterBy.status !== "all") {
    all = getByReleaseStatus({ data: all, statusOption: filterBy.status });
    watching = getByReleaseStatus({
      data: watching,
      statusOption: filterBy.status,
    });
    completed = getByReleaseStatus({
      data: completed,
      statusOption: filterBy.status,
    });
    paused = getByReleaseStatus({
      data: paused,
      statusOption: filterBy.status,
    });
    dropped = getByReleaseStatus({
      data: dropped,
      statusOption: filterBy.status,
    });
  }

  return {
    all,
    watching,
    completed,
    paused,
    dropped,
  };
};
