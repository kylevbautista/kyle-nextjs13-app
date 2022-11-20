"use client";
import { HydrationProvider } from "../components/common/HydrationProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <HydrationProvider>{children}</HydrationProvider>;
}
