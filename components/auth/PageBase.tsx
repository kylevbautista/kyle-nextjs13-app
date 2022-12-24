"use client";
import React, { ReactNode, useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import testQuery from "../../graphql/tags/testQuery.graphql";
import { print } from "graphql";
import LoginButton from "./LoginButton";
interface PageBaseProps {
  children?: ReactNode;
}

const fetchGraphQLServer = async () => {
  try {
    const res = await fetch("api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: print(testQuery),
      }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

export default function PageBase({ children }: PageBaseProps) {
  const { data: session } = useSession();

  const handleClick = async () => {
    try {
      const data = await fetchGraphQLServer();
      console.log("Kylelog data:", data);
    } catch (err) {
      console.log(err);
    }
  };

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
      <button
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
      </button>
    </div>
  );
}
