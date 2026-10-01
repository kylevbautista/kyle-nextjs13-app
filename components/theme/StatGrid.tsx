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

/** One fact: a mono label over a big number, with an optional note (e.g. which show). */
export function Stat({
  label,
  value,
  note,
  noteTitle,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  noteTitle?: string;
}) {
  return (
    <div className="min-w-0 bg-[#0a1428]/90 px-4 py-3">
      <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#95ccff]">{label}</dt>
      <dd className="mt-1 text-2xl font-black tabular-nums text-white">{value}</dd>
      {note && (
        <dd className="mt-0.5 line-clamp-3 break-words text-xs text-[rgb(200,206,218)]" title={noteTitle}>
          {note}
        </dd>
      )}
    </div>
  );
}
