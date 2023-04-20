"use client";
import { useCallback } from "react";
import { HydrationProvider } from "../components/common/HydrationProvider";
import { SessionProvider } from "next-auth/react";
import { RouterChangeProviderWrapper } from "../components/common/RouterChangeProviderWrapper";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* <RouterChangeProviderWrapper> */}
      <HydrationProvider>
        {children}
        <Toaster />
      </HydrationProvider>
      {/* </RouterChangeProviderWrapper> */}
    </SessionProvider>
  );
}
