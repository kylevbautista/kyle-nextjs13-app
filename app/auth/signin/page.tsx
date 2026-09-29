import type { Metadata } from "next";
import { Suspense } from "react";
import PageBase, { SignInCard } from "../../../components/auth/signIn/PageBase";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <main className="flex justify-center px-4 py-10 sm:py-16">
      <Suspense
        fallback={
          <SignInCard>
            <div
              aria-hidden="true"
              className="h-12 w-full animate-pulse rounded-xl bg-[rgb(53,53,53)]"
            />
          </SignInCard>
        }
      >
        <PageBase />
      </Suspense>
    </main>
  );
}
