"use client";
import React, { ReactNode, useState, useEffect } from "react";
interface PageBaseProps {
  children?: ReactNode;
}

export default function PageBase({ children }: PageBaseProps) {
  useEffect(() => {
    const observer = new IntersectionObserver((elements) => {
      elements.forEach((el) => {
        if (el.isIntersecting) {
          console.log("Kylelog: ", el.target.classList);
          el.target.classList.add("showTest");
        } else {
          el.target.classList.remove("showTest");
        }
      });
    });

    const hiddenElements = document.querySelectorAll("[data-observe]");
    hiddenElements.forEach((el) => observer.observe(el));
  }, []);

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
      "
    >
      <div
        className="
          flex 
          justify-center 
          items-center
          min-h-screen 
          hiddenTest"
        data-observe
      >
        <p className="text-9xl">I</p>
      </div>
      <div
        className="
          flex 
          justify-center 
          items-center
          min-h-screen 
          hiddenTest"
        data-observe
      >
        <p className="text-9xl">am</p>
      </div>
      <div
        className="
          flex 
          justify-center 
          items-center
          min-h-screen 
          hiddenTest
          duration-[2000ms]"
        data-observe
      >
        <p className="text-9xl">atomic</p>
      </div>
    </div>
  );
}
