interface GridProps {
  children?: React.ReactNode;
  columnsClassName?: string;
}
export default function Grid({
  children,
  columnsClassName = "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
}: GridProps) {
  return (
    <div className={`grid min-w-0 w-full gap-4 text-white ${columnsClassName}`}>
      {children}
    </div>
  );
}
