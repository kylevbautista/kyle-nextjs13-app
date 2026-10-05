import { FIELD, LABEL_CLASS } from "./tokens";

/*
 * My List's filter console pieces, shared with /search's filter panel
 * (app/search/FilteredSearchConsole.tsx). Hook-free, no directive.
 */

type Option = { value: string; label: string };
type FilterSelectProps = { id: string; label: string; options: readonly Option[]; className?: string } & (
  /** Controlled (My List). */
  | { value: string; onChange: (value: string) => void; name?: undefined; defaultValue?: undefined }
  /** A GET form's field (/search). */
  | { name: string; defaultValue: string; value?: undefined; onChange?: undefined }
);

const WRAPPER = "flex min-w-0 flex-col gap-1.5";

/** A labelled select: LABEL_CLASS over FIELD. */
export function FilterSelect({ id, label, options, className, value, onChange, name, defaultValue }: FilterSelectProps) {
  return (
    <div className={className ? `${WRAPPER} ${className}` : WRAPPER}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        {...(onChange
          ? { value, onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value) }
          : { name, defaultValue })}
        className={FIELD}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** "2 active" on a filters toggle; nothing at 0. */
export function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={`items-center rounded-full bg-blue-600 px-2 text-[11px] text-white ${className}`}>
      {count}
      <span className="sr-only"> active</span>
    </span>
  );
}

/** The filters toggle's icon (aria-hidden). */
export function FilterIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className}>
      <path d="M3 5h14M6 10h8M9 15h2" />
    </svg>
  );
}
