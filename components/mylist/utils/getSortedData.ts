import { unixTimeStampToWeekDay } from "../../animev3/utils/timeStampHelpers";

const getSeason = (month: any) => {
  if (month <= 3) {
    return "winter";
  }
  if (month >= 4 && month <= 6) {
    return "spring";
  }
  if (month >= 7 && month <= 9) {
    return "summer";
  }
  if (month >= 10 && month <= 12) {
    return "fall";
  }
};

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
