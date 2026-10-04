import type { Ref } from "react";
import { GOOGLE_BUTTON, GOOGLE_BUTTON_PANEL } from "@/components/theme/tokens";
import GoogleIcon from "./GoogleIcon";

/**
 * Google's light "Sign in with Google" button (tokens: GOOGLE_BUTTON). The site's one Google button:
 * /auth/signin's island and its static fallback, and the landing's "Sign in to add" dialog. No
 * directive: the server-rendered fallback renders it too (without onClick).
 * `busy` = aria-disabled: keeps focus, so the caller's handler must ignore clicks while busy.
 * `disabled` = the static fallback only (nothing to focus before JavaScript runs).
 */
export default function GoogleButton({
  label,
  busy = false,
  disabled = false,
  onClick,
  surface = "console",
  className = "",
  ref,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** The ring offset's surface: "console" (#0a1528) or "panel" (rgb 30). */
  surface?: "console" | "panel";
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={busy || undefined}
      className={`${surface === "panel" ? GOOGLE_BUTTON_PANEL : GOOGLE_BUTTON} ${className}`}
    >
      <GoogleIcon />
      <span>{label}</span>
    </button>
  );
}
