import type { ReactNode } from "react";
import { SageTag, type SageKind } from "@/components/home/SageLine";
import Slime, { type SlimeMood } from "@/components/home/Slime";
import { EMPTY_PANEL } from "./tokens";

/**
 * The themed empty / error / "nothing matches" state: a slime, an optional
 * title, one Great Sage line and up to a few actions (PRIMARY_BUTTON first,
 * then GHOST_BUTTON). The landing's ReportPanel, generalized.
 *
 * Moods: `idle` for "nothing yet", `worried` for failures and dead ends,
 * `sage` for analysis results, `happy` for a cleared state.
 */
export default function SagePanel({
  kind,
  mood = "idle",
  title,
  titleAs: Title = "h2",
  children,
  actions,
  className = "",
}: {
  kind: SageKind;
  mood?: SlimeMood;
  title?: ReactNode;
  titleAs?: "h2" | "h3" | "p";
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 px-6 py-12 text-center ${EMPTY_PANEL} ${className}`}
    >
      <Slime size={64} mood={mood} />
      {title && <Title className="max-w-full break-words text-xl font-bold text-white">{title}</Title>}
      <p className="max-w-md text-sm leading-6 text-[rgb(200,206,218)] sm:text-base">
        <SageTag kind={kind} />
        {children}
      </p>
      {actions && <div className="mt-1 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}
