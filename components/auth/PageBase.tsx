"use client";
import React, { ReactNode, useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import LoginButton from "./LoginButton";
interface PageBaseProps {
  children?: ReactNode;
}

export default function PageBase({ children }: PageBaseProps) {
  const { data: session } = useSession();
  // console.log("kylelog session: ", session);
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
      "
    >
      <LoginButton></LoginButton>
    </div>
  );
}
