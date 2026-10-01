"use client";
import { SessionProvider } from "next-auth/react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      {/* Toasts read as Great Sage console messages (the Tempest theme). */}
      <Toaster
        toastOptions={{
          style: {
            background: "#0a1528",
            color: "#e6f3ff",
            border: "1px solid rgba(149,204,255,.3)",
            borderRadius: "12px",
            boxShadow: "0 0 24px -8px rgba(149,204,255,.5)",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#34d399", secondary: "#0a1528" } },
          error: { iconTheme: { primary: "#fb7185", secondary: "#0a1528" } },
        }}
      />
      <Analytics />
    </SessionProvider>
  );
}
