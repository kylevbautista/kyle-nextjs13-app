"use client";
import { useEffect } from "react";
import { trackOnce, type FaqQuestion } from "./analytics";

const QUESTIONS: readonly string[] = ["free", "google", "visibility", "countdowns", "import", "phone"];
const isQuestion = (value: string | undefined): value is FaqQuestion =>
  value !== undefined && QUESTIONS.includes(value);

/**
 * Renders nothing: one capturing 'toggle' listener on #faq ('toggle' doesn't
 * bubble) fires faq_open once per question per page view.
 */
export default function FaqAnalytics() {
  useEffect(() => {
    const section = document.getElementById("faq");
    if (!section) return;
    const onToggle = (event: Event) => {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement) || !details.open) return;
      const q = details.dataset.q;
      if (isQuestion(q)) trackOnce("faq_open", { q });
    };
    section.addEventListener("toggle", onToggle, true);
    return () => section.removeEventListener("toggle", onToggle, true);
  }, []);
  return null;
}
