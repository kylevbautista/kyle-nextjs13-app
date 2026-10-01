import { Stat, StatGrid } from "@/components/theme/StatGrid";
import type { GlanceFact } from "./ranking";

const COLUMNS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" };

/** "The top 25 at a glance": real facts about page 1, each naming its show (640px+). */
export default function GlanceStats({ count, facts }: { count: number; facts: GlanceFact[] }) {
  if (!facts.length) return null;
  return (
    <div className="mt-6 hidden max-w-3xl sm:block">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[rgb(164,164,164)]">
        The top {count} at a glance
      </p>
      <StatGrid className={`mt-2 ${COLUMNS[facts.length] ?? "grid-cols-3"}`}>
        {facts.map((fact) => (
          <Stat
            key={fact.label}
            label={fact.label}
            value={
              fact.spoken ? (
                <>
                  <span aria-hidden="true">{fact.value}</span>
                  <span className="sr-only">{fact.spoken}</span>
                </>
              ) : (
                fact.value
              )
            }
            note={fact.note}
            noteTitle={fact.note}
          />
        ))}
      </StatGrid>
    </div>
  );
}
