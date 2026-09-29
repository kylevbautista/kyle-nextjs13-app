"use client";
import { useEffect, useRef } from "react";

const WORDS = ["I", "am", "atomic"];

/** The "I / am / atomic" scroll-reveal: each word slides in as it enters the viewport. */
export default function PageBase() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.toggleAttribute("data-visible", entry.isIntersecting);
      });
    });
    container
      .querySelectorAll("[data-observe]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center overflow-x-clip text-white sm:p-4"
    >
      {WORDS.map((word) => (
        <div
          key={word}
          className="flex min-h-screen w-full items-center justify-center"
        >
          <div
            data-observe
            className="flex w-full justify-center px-4 opacity-0 data-[visible]:animate-slideInFromLeft motion-reduce:opacity-100 motion-reduce:!animate-none"
          >
            <p className="break-words text-7xl sm:text-8xl md:text-9xl">
              {word}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
