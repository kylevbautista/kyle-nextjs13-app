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
      {/* <button
        className="
          border
          p-5
          bg-[rgb(38,38,38)]
          hover:bg-sky-700
          rounded-md
          w-72
        "
        onClick={handleClick}
      >
        Cick to send request
      </button> */}
    </div>
  );
}
