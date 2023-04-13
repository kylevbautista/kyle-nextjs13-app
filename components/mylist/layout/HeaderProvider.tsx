"use client";
import { createContext, useState, useEffect, ReactNode } from "react";
import { getCurrentYear } from "../../animev3/utils/routeChecker";
import { getCurrentSeasonPath } from "../../animev3/helpers";

const HeaderContext = createContext<any>(null);

function HeaderProvider({ children }: { children: ReactNode }) {
  const [option, setOption] = useState("all");
  const [year, setYear] = useState(getCurrentYear({ useUsaTime: true }));
  const [season, setSeason] = useState(getCurrentSeasonPath(null, true));
  const [day, setDay] = useState("any");
  useEffect(() => {}, []);
  return (
    <HeaderContext.Provider
      value={{
        option,
        setOption,
        year,
        setYear,
        season,
        setSeason,
        day,
        setDay,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export { HeaderProvider, HeaderContext };
