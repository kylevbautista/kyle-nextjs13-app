"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function SignOutButton() {
  const [pending, setPending] = useState(false);

  const handleSignOut = async () => {
    setPending(true);
    try {
      await signOut({ callbackUrl: "/" });
    } catch {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={pending}
      className="w-full rounded-xl border border-[rgb(53,53,53)] bg-[rgb(30,30,30)] px-4 py-3 font-medium text-white transition-colors hover:bg-[rgb(53,53,53)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
