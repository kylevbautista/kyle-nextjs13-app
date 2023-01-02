"use client";
import { ReactNode } from "react";
import { SWRConfig } from "swr";

interface PageBaseProps {
  data?: any;
  children?: ReactNode;
}

export const TestProvider = ({ data, children }: PageBaseProps) => {
  return (
    <SWRConfig value={{ fallback: { "/mylist": data } }}>{children}</SWRConfig>
  );
};
