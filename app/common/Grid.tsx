interface GridProps {
  children?: React.ReactNode;
}
export default function Grid({ children }: GridProps) {
  return (
    <div
      id="main-grid"
      className="
        grid
        grid-cols-1
        sm:grid-cols-2
        xl:grid-cols-3
        2xl:grid-cols-4
        text-white 
        gap-4 
        w-full
        "
      // className="grid
      // sm:grid-cols-3
      // md:grid-cols-6
      // lg:grid-cols-8
      // xl:grid-cols-10
      // 2xl:grid-cols-12
      // text-white gap-2 w-11/12
      // border-2 border-blue-900
      // grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
    >
      {children}
    </div>
  );
}
