"use client";
import { HydrationProvider } from "../components/common/HydrationProvider";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <HydrationProvider>{children}</HydrationProvider>
    </SessionProvider>
  );
}
