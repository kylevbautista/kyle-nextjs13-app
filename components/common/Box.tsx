interface BoxProps {
  children?: React.ReactNode;
}

export default function Box({ children }: BoxProps) {
  return (
    <div
      className="
    basis-[100%]
    sm:basis-[40%]
    xl:basis-[30%]
    2xl:basis-[24.26%]
    border-2 
    border-white,
    bg-blue-700"
    >
      {children}
    </div>
  );
}
