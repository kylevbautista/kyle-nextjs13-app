"use client";
import { useCallback, useRef, useSyncExternalStore } from "react";
import toast from "react-hot-toast";
import { SageLine } from "@/components/home/SageLine";
import { markQuest } from "@/components/home/questStore";
import { myListPath } from "@/lib/routes";
import { FOCUS_RING } from "./tokens";

const subscribeNothing = () => () => {};
const getHost = () => window.location.host;
const getServerHost = () => "kylevb.com";

/**
 * Copies the owner's list link and clears the landing's Quest 3 ("Share your
 * list's link") for them. Pass the input to select when the clipboard is
 * blocked, so the link can still be copied by hand.
 */
export function useCopyListLink(userId: string) {
  return useCallback(
    async (fallback?: HTMLInputElement | null) => {
      const url = new URL(myListPath(userId), window.location.origin).href;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied. Anyone with it can look; only you can edit.");
      } catch {
        if (fallback) {
          fallback.focus();
          fallback.select();
          toast.error("Couldn't copy. Select the link and copy it.");
        } else {
          toast.error(`Couldn't copy automatically. Your list's link is ${url}`);
        }
      }
      markQuest(userId, "share");
    },
    [userId]
  );
}

/**
 * The landing's share strip, for the list owner: a Great Sage line, the
 * read-only link (with the slow shimmer) and Copy link.
 */
export default function ShareLink({ userId }: { userId: string }) {
  const host = useSyncExternalStore(subscribeNothing, getHost, getServerHost);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = useCopyListLink(userId);

  return (
    <div className="rounded-2xl border border-dashed border-[#95ccff]/30 p-4">
      <SageLine kind="Notice" size="sm">
        Named monsters evolve. Named lists get shared.
      </SageLine>
      <p className="mt-3 text-sm leading-6 text-[rgb(200,206,218)]">
        Send your list to a friend: anyone with the link can look, only you can edit.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="url-shimmer min-w-0 flex-1 rounded-lg border border-[rgb(53,53,53)] bg-[rgb(18,18,18)]">
          <input
            ref={inputRef}
            readOnly
            aria-label="Your list link"
            value={`${host}${myListPath(userId)}`}
            onFocus={(event) => event.currentTarget.select()}
            className="h-11 w-full truncate bg-transparent px-3 font-mono text-sm text-[#cfe8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff]"
          />
        </div>
        <button
          type="button"
          onClick={() => copy(inputRef.current)}
          aria-label="Copy the link to your list"
          className={`inline-flex h-11 shrink-0 items-center rounded-lg border border-[#95ccff]/40 bg-white/5 px-4 text-sm font-semibold text-[#e6f3ff] transition-colors hover:bg-white/10 ${FOCUS_RING}`}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}
