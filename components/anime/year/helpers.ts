export enum Season {
  WINTER,
  SPRING,
  SUMMER,
  FALL,
}

export const getSeasonFromEnum = (season: Season) => {
  if (season === Season.WINTER) {
    return "Winter";
  }
  if (season === Season.SPRING) {
    return "Spring";
  }
  if (season === Season.SUMMER) {
    return "Summer";
  }
  if (season === Season.FALL) {
    return "Fall";
  }
};

export const getSeasonFromParams = (season: string) => {
  if (season === "winter") {
    return Season.WINTER;
  }
  if (season === "spring") {
    return Season.SPRING;
  }
  if (season === "summer") {
    return Season.SUMMER;
  }
  if (season === "fall") {
    return Season.FALL;
  }
  return Season.WINTER;
};

export const unixTimeStampToDate = (unixTimeStamp: number) => {
  const javaScriptTimeStamp: number = unixTimeStamp * 1000;
  const dateObject = new Date(javaScriptTimeStamp);
  const time = dateObject.toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
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

  return ok;
};

export const getCurrentSeason = (date: any = null): Season => {
  let month = date;
  if (!date) {
    const dateObject = new Date();
    month = dateObject.getUTCMonth();
  }

  if (month <= 1 || month === 11) {
    return Season.WINTER;
  }
  if (month >= 2 && month <= 4) {
    return Season.SPRING;
  }
  if (month >= 5 && month <= 7) {
    return Season.SUMMER;
  }
  if (month >= 8 && month <= 10) {
    return Season.FALL;
  }
  return Season.WINTER;
};
export const getCurrentSeasonPath = (date: any = null): string => {
  let month = date;
  if (!date) {
    const dateObject = new Date();
    month = dateObject.getUTCMonth();
  }

  if (month <= 1 || month === 11) {
    return "winter";
  }
  if (month >= 2 && month <= 4) {
    return "spring";
  }
  if (month >= 5 && month <= 7) {
    return "summer";
  }
  if (month >= 8 && month <= 10) {
    return "fall";
  }
  return "winter";
};

export const getInitialTimes = (seconds: any) => {
  if (seconds) {
    let d = Math.floor(seconds / (3600 * 24));
    let h = Math.floor((seconds % (3600 * 24)) / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = Math.floor(seconds % 60);
    return { d, h, m, s };
  } else {
    return { d: 0, h: 0, m: 0, s: 0 };
  }
};
export const getInitialTimesFromTimeStamp = (unixTimeStamp: any = 0) => {
  if (unixTimeStamp && unixTimeStamp > Math.floor(Date.now() / 1000)) {
    const currentTimeStamp = Math.floor(Date.now() / 1000);
    let secondsLeft = unixTimeStamp - currentTimeStamp;
    let d = Math.floor(secondsLeft / (3600 * 24));
    let h = Math.floor((secondsLeft % (3600 * 24)) / 3600);
    let m = Math.floor((secondsLeft % 3600) / 60);
    let s = Math.floor(secondsLeft % 60);
    return { d, h, m, s };
  } else {
    return { d: 0, h: 0, m: 0, s: 0 };
  }
};

export const startTimer = (
  interval: any,
  seconds: any,
  setDay: any,
  setHour: any,
  setMinute: any,
  setSecond: any,
  info: any
) => {
  seconds = Number(seconds);

  interval = setInterval(() => {
    let d = Math.floor(seconds / (3600 * 24));
    let h = Math.floor((seconds % (3600 * 24)) / 3600);
    let m = Math.floor((seconds % 3600) / 60);
    let s = Math.floor(seconds % 60);
    setDay(d);
    setHour(h);
    setMinute(m);
    setSecond(s);

    let dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    let hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    let mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    let sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    const time = dDisplay + hDisplay + mDisplay + sDisplay;
    seconds = seconds - 1;
    if (info?.upcomingEpisode) {
      info.upcomingEpisode.timeUntilAiring = seconds;
    }
  }, 1000);
};

export const startTimerFromTimeStamp = (
  interval: any,
  unixTimeStamp: any = 0,
  setDay: any,
  setHour: any,
  setMinute: any,
  setSecond: any,
  info: any
) => {
  if (unixTimeStamp > Math.floor(Date.now() / 1000)) {
    interval = setInterval(() => {
      const currentTimeStamp = Math.floor(Date.now() / 1000);
      let secondsLeft = unixTimeStamp - currentTimeStamp;
      let d = Math.floor(secondsLeft / (3600 * 24));
      let h = Math.floor((secondsLeft % (3600 * 24)) / 3600);
      let m = Math.floor((secondsLeft % 3600) / 60);
      let s = Math.floor(secondsLeft % 60);
      setDay(d);
      setHour(h);
      setMinute(m);
      setSecond(s);
      if (secondsLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }
};

export const formatSource = (source: string) => {
  let noUnderScore = source.replaceAll("_", " ");

  const lowerCaseAllWordsExceptFirstLetters = (source: string) =>
    source.replaceAll(
      /\S*/g,
      (word: string) => `${word.slice(0, 1)}${word.slice(1).toLowerCase()}`
    );

  const result = lowerCaseAllWordsExceptFirstLetters(noUnderScore);

  return result;
};

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

export const getStudios = (studios: any) => {
  let studio = "";
  studios?.map((obj: any) => {
    if (studio) {
      studio += ` x ${obj.name}`;
    } else {
      studio += obj.name;
    }
  });
  return studio;
};

// -- jinkan --
// const {
//   title,
//   images,
//   synopsis,
//   url,
//   episodes,
//   duration,
//   aired,
//   source,
//   studios,
//   genres,
// } = info || {};
// const { jpg, webp } = images || {};
