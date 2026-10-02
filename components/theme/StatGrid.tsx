import type { ReactNode } from "react";

/**
 * The Great Sage stat readout: a console-bordered grid of facts (My List's
 * banner, Top Anime's glance). Pass the grid columns in `className`. Real
 * data only: every value must come from what the page loaded.
 */
export function StatGrid({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <dl
      className={`grid gap-px overflow-hidden rounded-xl border border-[#95ccff]/25 bg-[#95ccff]/15 ${className}`}
    >
      {children}
    </dl>
  );
}

/**
 * One fact: a mono label over a big number, with an optional note (e.g. which
 * show). Below 640px the cell tightens so four fit in one row on a phone.
 */
export function Stat({
  label,
  value,
  note,
  noteTitle,
  noteClassName = "",
  labelClassName = "",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  noteTitle?: string;
  /** e.g. "max-sm:hidden" to keep a phone's 4-across row short (keeps the line clamp elsewhere). */
  noteClassName?: string;
  /** e.g. a min height so values line up across cells when a label wraps. */
  labelClassName?: string;
}) {
  return (
    <div className="min-w-0 bg-[#0a1428]/90 px-2.5 py-2.5 sm:px-4 sm:py-3">
      <dt
        className={`font-mono text-[10px] uppercase leading-tight tracking-[0.1em] text-[#95ccff] sm:text-[11px] sm:tracking-[0.18em] ${labelClassName}`}
      >
        {label}
      </dt>
      <dd className="mt-1 text-base font-black tabular-nums text-white min-[360px]:text-lg sm:text-2xl">{value}</dd>
      {note && (
        <dd className={`mt-0.5 line-clamp-3 break-words text-xs text-[rgb(200,206,218)] ${noteClassName}`} title={noteTitle}>
          {note}
        </dd>
      )}
    </div>
  );
}
