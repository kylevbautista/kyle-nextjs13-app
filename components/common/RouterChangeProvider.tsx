import React, { createContext, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const RouterChangeContext = createContext(() => {});

const RouterChangeProvider = ({
  onStart,
  onComplete,
  children,
}: {
  onStart?: () => void;
  onComplete?: () => void;
  children: React.ReactNode;
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => setIsChanging(false), [pathname, searchParams]);

  useEffect(() => {
    if (isChanging) {
      /* @ts-ignore */
      onStart();
    } else {
      /* @ts-ignore */
      onComplete();
    }
  }, [isChanging]);

  return (
    <RouterChangeContext.Provider value={() => setIsChanging(true)}>
      {children}
    </RouterChangeContext.Provider>
  );
};

export { RouterChangeProvider, RouterChangeContext };
