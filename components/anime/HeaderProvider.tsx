"use client";
import { createContext, useState, useEffect, ReactNode } from "react";
import { getCurrentSeason } from "./year/helpers";

// const initialState = {
//   headerYear: "2020",
//   headerSeason: 0,
//   setHeaderYear: () => {},
//   setHeaderSeason: () => {},
// };

const HeaderContext = createContext<any>(null);

function HeaderProvider({ children }: { children: ReactNode }) {
  const dateObject = new Date();
  const currentYear = dateObject.getUTCFullYear();
  const [headerYear, setHeaderYear] = useState(null);
  const [headerSeason, setHeaderSeason] = useState(null);
  const [byCount, setByCount] = useState(true);
  const [byPopularity, setByPopularity] = useState(false);
  useEffect(() => {}, []);
  return (
    <HeaderContext.Provider
      value={{
        headerYear,
        setHeaderYear,
        headerSeason,
        setHeaderSeason,
        byCount,
        setByCount,
        byPopularity,
        setByPopularity,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export { HeaderProvider, HeaderContext };
