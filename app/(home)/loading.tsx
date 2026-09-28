export default function Loading() {
  return (
    <div
      role="status"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[rgb(164,164,164)]"
    >
      <span
        aria-hidden="true"
        className="h-10 w-10 animate-spin rounded-full border-4 border-[rgb(53,53,53)] border-t-[#95ccff] motion-reduce:animate-none"
      />
      <span>Loading…</span>
    </div>
  );
}
