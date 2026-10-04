import type { Metadata } from "next";
import { Suspense } from "react";
import GoogleButton from "@/components/auth/GoogleButton";
import SignInActions from "@/components/auth/signIn/SignInActions";
import SignInSlime from "@/components/auth/signIn/SignInSlime";
import NightSky from "@/components/home/NightSky";
import { SageLine } from "@/components/home/SageLine";
import CardPage from "@/components/theme/CardPage";
import { CARD_TEXT, CARD_TITLE_CLASS, SIGN_IN_ACTIONS } from "@/components/theme/tokens";
import { SIGN_IN_NOSCRIPT } from "@/lib/signIn";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * Static (○): the slime, h1 and subhead are server HTML; only the action slot is a client island
 * (useSearchParams, §9.10). No loading.tsx here or in app/auth (§9.15): its fallback would ship as
 * this page's static HTML and hide the card in <div hidden> until JavaScript swaps it in.
 */
export default function SignInPage() {
  return (
    <CardPage titleId="signin-title" size="sm" sky={<NightSky variant="page" forest={false} />}>
      <SignInSlime />
      <div className="flex flex-col gap-2">
        <h1 id="signin-title" className={CARD_TITLE_CLASS}>
          Sign in
        </h1>
        <p className={CARD_TEXT}>Keep a list, track your episode progress and get your own airing schedule.</p>
      </div>
      <Suspense fallback={<SignInActionsFallback />}>
        <SignInActions />
      </Suspense>
    </CardPage>
  );
}

/**
 * The first paint (the static HTML): the session-loading look, so hydration changes nothing on
 * screen. Without JavaScript sign-in can't work (signIn() is a CSRF-protected POST), so the button
 * hides (.js-only) and the Great Sage says so.
 */
function SignInActionsFallback() {
  return (
    <div className={SIGN_IN_ACTIONS}>
      <GoogleButton label="Sign in with Google" disabled className="js-only" />
      <noscript>
        <SageLine kind="Report" className="w-full justify-center">
          {SIGN_IN_NOSCRIPT}
        </SageLine>
      </noscript>
    </div>
  );
}
