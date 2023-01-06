import { unixTimeStampToWeekDay } from "../../animev3/utils/timeStampHelpers";

export const getSortedData = ({
  option = "Any",
  listSorted = [],
}: {
  option: any;
  listSorted: any;
}) => {
  const mondayList = listSorted?.filter(
    (anime: any) =>
      unixTimeStampToWeekDay(anime?.firstEpisode?.episode[0]?.airingAt)
        ?.dayOfTheWeek === "Monday"
  );
  const TuesdayList = listSorted?.filter(
    (anime: any) =>
      unixTimeStampToWeekDay(anime?.firstEpisode?.episode[0]?.airingAt)
        ?.dayOfTheWeek === "Tuesday"
  );
  const WednesdayList = listSorted?.filter(
    (anime: any) =>
      unixTimeStampToWeekDay(anime?.firstEpisode?.episode[0]?.airingAt)
        ?.dayOfTheWeek === "Wednesday"
  );
  const ThursdayList = listSorted?.filter(
    (anime: any) =>
      unixTimeStampToWeekDay(anime?.firstEpisode?.episode[0]?.airingAt)
        ?.dayOfTheWeek === "Thursday"
  );
  const FridayList = listSorted?.filter(
    (anime: any) =>
      unixTimeStampToWeekDay(anime?.firstEpisode?.episode[0]?.airingAt)
        ?.dayOfTheWeek === "Friday"
  );
  const SaturdayList = listSorted?.filter(
    (anime: any) =>
      unixTimeStampToWeekDay(anime?.firstEpisode?.episode[0]?.airingAt)
        ?.dayOfTheWeek === "Saturday"
  );
  const SundayList = listSorted?.filter(
    (anime: any) =>
      unixTimeStampToWeekDay(anime?.firstEpisode?.episode[0]?.airingAt)
        ?.dayOfTheWeek === "Sunday"
  );
  let data = listSorted;
  if (option === "Monday") {
    data = mondayList;
  } else if (option === "Tuesday") {
    data = TuesdayList;
  } else if (option === "Wednesday") {
    data = WednesdayList;
  } else if (option === "Thursday") {
    data = ThursdayList;
  } else if (option === "Friday") {
    data = FridayList;
  } else if (option === "Saturday") {
    data = SaturdayList;
  } else if (option === "Sunday") {
    data = SundayList;
  }

  return {
    data,
  };
};
