import { useCallback } from "react";
import { RouterChangeProvider } from "./RouterChangeProvider";
import NProgress from "nprogress";

export const RouterChangeProviderWrapper = ({
  children,
}: React.PropsWithChildren) => {
  const onStart = useCallback(() => NProgress.start(), []);
  const onComplete = useCallback(() => NProgress.done(), []);
  return (
    <RouterChangeProvider onStart={onStart} onComplete={onComplete}>
      {children}
    </RouterChangeProvider>
  );
};
