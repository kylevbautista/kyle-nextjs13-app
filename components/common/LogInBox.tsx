"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
// import { unstable_getServerSession } from "next-auth/next";
// import { authOptions } from "../../server/auth";
import { LinkRouterWrapper } from "./LinkRouterWrapper";

export default function LoginBox() {
  // const session = await unstable_getServerSession(authOptions);
  const { data: session, status } = useSession();

  const handleSignOut = () => {
    signOut({
      redirect: true,
      callbackUrl: "/",
    });
  };

  if (session) {
    return (
      <div className="flex justify-items-center">
        <LinkRouterWrapper
          href="/mylist"
          className="
            block
            p-5
            hover:bg-blue-500
            rounded-2xl
          "
        >
          <p>My List</p>
        </LinkRouterWrapper>
        <button
          className="
            p-5
           hover:bg-blue-500
            rounded-2xl
          "
          onClick={handleSignOut}
        >
          <p className="text-base">Sign out</p>
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-items-center">
      <LinkRouterWrapper
        href="/auth"
        className="
            block
            p-5
            hover:bg-blue-500
            rounded-2xl
          "
      >
        <p>LogIn</p>
      </LinkRouterWrapper>
    </div>
  );
}
