"use client";
import React, { ReactNode } from "react";
import LoginButton from "./LoginButton";
interface PageBaseProps {
  children?: ReactNode;
}

export default function PageBase({ children }: PageBaseProps) {
  return (
    <div
      id="container"
      className="
        flex 
        flex-col 
        justify-center 
        items-center 
        sm:p-4
        text-white
        transition-all
        gap-7
      "
    >
      <LoginButton></LoginButton>
    </div>
  );
}
