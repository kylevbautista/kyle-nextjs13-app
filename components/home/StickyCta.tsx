"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { airingSchedulePath } from "@/lib/routes";
import { trackLanding } from "./analytics";
import { SessionCta } from "./SessionCta";
import Slime from "./Slime";
import { useLandingSession } from "./useLandingSession";

/**
 * Keeps the primary action one tap away once the hero CTA has scrolled out
 * of view: a fixed bar below lg, a floating pill from lg up. Hidden (inert,
 * aria-hidden, translated off-screen) while the hero CTA, the #quests
 * section or the site footer is on screen. Visibility is set only from one
 * IntersectionObserver callback; there are no scroll listeners.
 */
export default function StickyCta() {
  const session = useLandingSession();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    // The whole Quest Log, not just its CTA row: its content changes with the
    // session, and the bar would cover the quest cards on phones.
    const quests = document.getElementById("quests");
    const footer = document.querySelector("body > footer");
    const targets = [hero, quests, footer].filter((el): el is HTMLElement => el !== null);
    if (!targets.length) return;

    const onScreen = new Map<Element, boolean>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) onScreen.set(entry.target, entry.isIntersecting);
      const heroVisible = hero ? (onScreen.get(hero) ?? true) : false;
      const questsVisible = quests ? (onScreen.get(quests) ?? false) : false;
      const footerVisible = footer ? (onScreen.get(footer) ?? false) : false;
      setVisible(!heroVisible && !questsVisible && !footerVisible);
    });
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const showSchedule = session.status === "signedIn" && session.count !== 0;

  return (
    <div
      inert={!visible}
      aria-hidden={visible ? undefined : true}
      className={`fixed inset-x-0 bottom-0 z-30 flex h-[calc(4rem+env(safe-area-inset-bottom))] items-center gap-3 border-t border-[rgb(53,53,53)] bg-[rgb(30,30,30)]/95 px-4 pb-[env(safe-area-inset-bottom)] shadow-[inset_0_1px_0_rgba(149,204,255,0.2)] transition-transform duration-200 ease-out motion-reduce:transition-none lg:inset-x-auto lg:bottom-6 lg:right-6 lg:h-auto lg:gap-2 lg:rounded-full lg:border lg:border-[#95ccff]/30 lg:p-2 lg:shadow-lg lg:shadow-black/50 ${
        visible ? "translate-y-0" : "translate-y-full lg:translate-y-[calc(100%+2rem)]"
      }`}
    >
      <Slime size={28} animated={false} className="shrink-0" />
      {/* Two short lines on ~375px phones rather than "Never miss an …". */}
      <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-tight text-[#e6f3ff] max-[359px]:hidden lg:hidden">
        Never miss an episode
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
        <SessionCta location="sticky" size="sticky" />
        {showSchedule && (
          <Link
            href={airingSchedulePath(session.userId)}
            prefetch={false}
            onClick={() => trackLanding("cta_click", { cta: "airing_schedule", location: "sticky" })}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-[rgb(53,53,53)] bg-transparent px-4 text-sm font-semibold text-[#e6f3ff] transition-colors hover:border-[#95ccff]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#95ccff] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(30,30,30)]"
          >
            Schedule
          </Link>
        )}
      </div>
    </div>
  );
}
