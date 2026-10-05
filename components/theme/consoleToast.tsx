"use client";
import toast from "react-hot-toast";
import { SageTag } from "@/components/home/SageLine";
import Slime from "@/components/home/Slime";
import type { ConsoleMessage } from "@/lib/anime/trackerConsole";

/** One console line at a time: each event replaces the last instead of stacking. */
const CONSOLE_TOAST_ID = "tracker-console";

/**
 * The landing demo's Great Sage console, as a toast: a still slime, the
 * 《Kind》 tag and the line from lib/anime/trackerConsole.ts. Visual only
 * (aria-live off): the page speaks `message.spoken` through its own
 * persistent status line, which screen readers announce more reliably than a
 * freshly inserted toast, and so nothing is said twice.
 */
export function consoleToast(message: ConsoleMessage, { celebrate = false }: { celebrate?: boolean } = {}) {
  // A Warning (a failed save) gets the worried slime and stays as long as a celebration.
  const warning = message.kind === "Warning";
  toast.success(
    <span className="font-mono text-[13px] leading-5">
      <SageTag kind={message.kind} />
      {message.text}
    </span>,
    {
      id: CONSOLE_TOAST_ID,
      duration: celebrate || warning ? 5_000 : 3_000,
      icon: <Slime size={26} mood={warning ? "worried" : celebrate ? "happy" : "idle"} animated={false} />,
      ariaProps: { role: "status", "aria-live": "off" },
    }
  );
}
