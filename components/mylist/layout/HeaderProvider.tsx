"use client";
import { createContext, useState, useEffect, ReactNode } from "react";

const HeaderContext = createContext<any>(null);

function HeaderProvider({ children }: { children: ReactNode }) {
  const [option, setOption] = useState("Any");
  useEffect(() => {}, []);
  return (
    <HeaderContext.Provider
      value={{
        option,
        setOption,
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
}

export { HeaderProvider, HeaderContext };
