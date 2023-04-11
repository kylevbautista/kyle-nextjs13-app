"use client";
import { createContext, useState, useEffect, ReactNode, useRef } from "react";

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
  const prevCountRef = useRef(byCount);
  useEffect(() => {
    prevCountRef.current = byCount;
  }, [byCount]);
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
        prevCountRef,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export { HeaderProvider, HeaderContext };
