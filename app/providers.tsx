"use client";
import { HydrationProvider } from "../components/common/HydrationProvider";
import { SessionProvider } from "next-auth/react";
// import { RouterChangeProviderWrapper } from "../components/common/RouterChangeProviderWrapper";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* <RouterChangeProviderWrapper> */}
      <HydrationProvider>
        {children}
        <Toaster />
        <Analytics />
      </HydrationProvider>
      {/* </RouterChangeProviderWrapper> */}
    </SessionProvider>
  );
}
