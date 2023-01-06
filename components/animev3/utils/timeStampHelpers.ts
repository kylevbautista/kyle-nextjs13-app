export const unixTimeStampToWeekDay = (unixTimeStamp: number) => {
  const javaScriptTimeStamp: number = unixTimeStamp * 1000;
  const dateObject = new Date(javaScriptTimeStamp);
  const time = dateObject.toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const year = dateObject.getUTCFullYear();
  const month = months[dateObject.getUTCMonth()];
  const day = dateObject.getUTCDate();
  const hour = dateObject.getUTCHours();
  const min = dateObject.getUTCMinutes();
  const sec = dateObject.getUTCSeconds();

  let time2 =
    day + " " + month + " " + year + " " + hour + ":" + min + ":" + sec;
  let ok = `${month} ${day}, ${year} at ${time}`;

  // console.log("utc", dateObject.toUTCString());
  const [dayOfTheWeek] = time.split(",");
  // console.log("pst", dayOfTheWeek);

  return {
    firstEpisode: ok,
    dayOfTheWeek,
  };
};
