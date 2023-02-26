"use client";
import { useCallback } from "react";
import { HydrationProvider } from "../components/common/HydrationProvider";
import { SessionProvider } from "next-auth/react";
import { RouterChangeProviderWrapper } from "../components/common/RouterChangeProviderWrapper";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RouterChangeProviderWrapper>
        <HydrationProvider>{children}</HydrationProvider>
      </RouterChangeProviderWrapper>
    </SessionProvider>
  );
}
