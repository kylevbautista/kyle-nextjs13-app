import type { ReactNode } from "react";
import { SageTag, type SageKind } from "@/components/home/SageLine";

/**
 * A console doorway: an icon, a 《Kind》 line, "**Lead:** text" and one link
 * (a next/link with DOORWAY_LINK). The landing's Top Anime doorway and the
 * /search home's "Browse this season" (the owner's line); both ask a
 * question, so they pass kind="Question". Hook-free.
 */
export default function SageDoorway({
  kind,
  icon,
  line,
  lead,
  text,
  action,
}: {
  kind: SageKind;
  icon: ReactNode;
  line: string;
  lead: string;
  text: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {icon}
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-mono text-xs text-[#95ccff]">
          <SageTag kind={kind} />
          {line}
        </p>
        <p className="mt-1 text-sm leading-6 text-[rgb(200,206,218)]">
          <strong className="font-semibold text-white">{lead}</strong> {text}
        </p>
      </div>
      {action}
    </div>
  );
}
