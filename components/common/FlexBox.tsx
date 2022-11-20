import { ReactNode, ReactElement } from "react";
interface FlexBoxProps {
  children?: ReactNode;
}

// Typescript handles return type automaticaclly for react but can you React.ReactElement
export default function FlexBox({ children }: FlexBoxProps): ReactElement {
  return (
    <div
      className="
      flex flex-wrap 
      w-[100%]
      gap-4 border-2
      border-blue-800 
      border-dotted
      text-white 
      "
    >
      {children}
    </div>
  );
}
