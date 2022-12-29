import { getCurrentSeasonPath } from "../helpers";

export const getCurrentYear = ({
  useUsaTime = false,
}: {
  useUsaTime: Boolean;
}) => {
  const dateObject = new Date();
  const currentYear = dateObject.getUTCFullYear();
  const currentMonth = dateObject.getUTCMonth();

  // If shifted is false and month is December/11 return currentYear + 1
  if (currentMonth === 11 && !useUsaTime) {
    return currentYear + 1;
  }

  // If shifted is true and month is December/11 return currentYear
  return currentYear;
};

export const routeChecker = ({ year, season }: any) => {
  let redirect = null;
  const regExExpression = /^\d{4}$/;
  const dateObject = new Date();
  let currentYear = dateObject.getUTCFullYear();

  // If year is valid
  if (regExExpression.test(year)) {
    const parsedIntYear = parseInt(year);

    // If year is not withing specified range, redirect
    if (parsedIntYear < currentYear - 5 || parsedIntYear > currentYear + 1) {
      redirect = `/anime/${getCurrentYear({
        useUsaTime: true,
      })}/${getCurrentSeasonPath(null, true)}`;
      return { redirectUrl: redirect };
    }
  }
  // If year is not valid, redirect
  else {
    redirect = `/anime/${getCurrentYear({
      useUsaTime: true,
    })}/${getCurrentSeasonPath(null, true)}`;
    return { redirectUrl: redirect };
  }

  // If season does not match defined season, redirect
  if (
    season !== "winter" &&
    season !== "spring" &&
    season !== "summer" &&
    season !== "fall"
  ) {
    redirect = `/anime/${getCurrentYear({
      useUsaTime: true,
    })}/${getCurrentSeasonPath(null, true)}`;
  }

  return { redirectUrl: redirect };
};
