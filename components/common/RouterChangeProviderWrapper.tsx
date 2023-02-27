import { useCallback } from "react";
import { RouterChangeProvider } from "./RouterChangeProvider";
import NProgress from "nprogress";

export const RouterChangeProviderWrapper = ({
  children,
}: React.PropsWithChildren) => {
  const onStart = useCallback(() => {
    NProgress.configure({
      easing: "ease",
      speed: 1000,
      showSpinner: false,
    });
    NProgress.set(0.7);
    NProgress.start();
  }, []);
  const onComplete = useCallback(() => {
    NProgress.configure({
      speed: 200,
    });
    NProgress.done();
  }, []);
  return (
    <RouterChangeProvider onStart={onStart} onComplete={onComplete}>
      {children}
    </RouterChangeProvider>
  );
};
