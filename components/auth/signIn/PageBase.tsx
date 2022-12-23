"use client";
import React, { ReactNode, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import LoginButton from "../LoginButton";
interface PageBaseProps {
  children?: ReactNode;
}

export default function PageBase({ children }: PageBaseProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleOAuthSignIn = (provider: string) => {
    return () => signIn(provider);
  };

  if (status === "loading") {
    return (
      <div
        className="
          flex 
          flex-col 
          justify-center 
          items-center 
          text-white
          h-screen
        "
      >
        <p>Loading Providers...</p>
      </div>
    );
  }
  if (session) {
    // setTimeout(() => {
    router.push(`/auth`);
    // }, 2500);

    return (
      <div
        className="
          flex 
          flex-col 
          justify-center 
          items-center 
          text-white
        "
      >
        <p>Redirecting...</p>
      </div>
    );
  }
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
        gap-5
        h-screen
      "
    >
      <button
        className="
          border
          p-5
          bg-[rgb(38,38,38)]
          hover:bg-sky-700
          rounded-md
          w-72
        "
        onClick={handleOAuthSignIn("github")}
      >
        <p>SIGN IN WITH GITHUB</p>
      </button>
      <button
        className="
          border
          p-5
          bg-[rgb(38,38,38)]
          hover:bg-sky-700
          rounded-md
          w-72
        "
        onClick={handleOAuthSignIn("twitter")}
      >
        <p>SIGN IN WITH TWITTER</p>
      </button>
    </div>
  );
}
