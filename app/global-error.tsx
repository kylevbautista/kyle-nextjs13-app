"use client";
import { useEffect } from "react";
import Link from "next/link";

// Replaces the root layout, so globals.css (and Tailwind) aren't loaded here: inline styles only.
export default function GlobalError({
  error,
  reset,
  retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          boxSizing: "border-box",
          background: "rgb(18,18,18)",
          color: "white",
          colorScheme: "dark",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <title>Something went wrong · kylevb</title>
        <main style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 12px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "rgb(164,164,164)", margin: "0 0 24px" }}>
            kylevb hit an unexpected error. Please try again.
          </p>
          <div
            style={{ display: "flex", gap: "12px", justifyContent: "center" }}
          >
            <button
              type="button"
              onClick={() => (retry ?? reset)()}
              style={{
                padding: "12px 20px",
                borderRadius: "12px",
                border: "none",
                background: "rgb(37,99,235)",
                color: "white",
                font: "inherit",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                padding: "12px 20px",
                borderRadius: "12px",
                border: "1px solid rgb(53,53,53)",
                background: "rgb(38,38,38)",
                color: "white",
                textDecoration: "none",
              }}
            >
              Home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
