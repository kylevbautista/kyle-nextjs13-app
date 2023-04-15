"use client";
import { ReactNode } from "react";
import { SWRConfig } from "swr";

interface PageBaseProps {
  data?: any;
  userParam?: any;
  children?: ReactNode;
}

export const TestProvider = ({ data, children, userParam }: PageBaseProps) => {
  return (
    <SWRConfig value={{ fallback: { [`/mylist/${userParam}`]: data } }}>
      {children}
    </SWRConfig>
  );
};
