"use client";
import { ReactNode } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

interface PageBaseProps {
  children?: ReactNode;
}

export default function LoginButton({ children }: PageBaseProps) {
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut({
      redirect: true,
      callbackUrl: "/",
    });
  };

  const handleSignIn = () => {
    signIn();
  };

  if (session) {
    return (
      <>
        Signed in as: {session?.user?.email || "Email Unavailable"} <br />
        <div className="mb-[100px]">
          <p>This only appears when signed in</p>
        </div>
        <button
          className="
            border 
            rounded-md 
            p-6
            bg-[rgb(38,38,38)]
            hover:bg-sky-700
          "
          onClick={handleSignOut}
        >
          <p className="text-xl">Sign out</p>
        </button>
        {children}
      </>
    );
  }
  return (
    <div
      className="
        flex
        flex-col
        justify-center
        items-center
        h-screen
      "
    >
      <button
        className="
          border 
          rounded-3xl
          p-6
          bg-[rgb(38,38,38)]
          hover:bg-sky-700
        "
        onClick={handleSignIn}
      >
        <p className="flex text-9xl">SIGN IN</p>
      </button>
    </div>
  );
}
