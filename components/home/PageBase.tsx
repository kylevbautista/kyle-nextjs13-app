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
          el.target.classList.add("animate-slideInFromLeft");
        } else {
          el.target.classList.remove("animate-slideInFromLeft");
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
        transition-all
      "
    >
      <div
        className="
          flex 
          justify-center 
          items-center
          min-h-screen 
          min-w-full
        "
      >
        <div
          className=" 
          flex 
          justify-center 
          items-center 
          min-w-full
        "
          data-observe
        >
          <p className="text-9xl">I</p>
        </div>
      </div>
      <div
        className="
          flex 
          justify-center 
          items-center
          min-h-screen 
          min-w-full
        "
      >
        <div
          className=" 
          flex 
          justify-center 
          items-center 
          min-w-full
        "
          data-observe
        >
          <p className="text-9xl">am</p>
        </div>
      </div>
      <div
        className="
          flex 
          justify-center 
          items-center
          min-h-screen 
          min-w-full
        "
      >
        <div
          className=" 
          flex 
          justify-center 
          items-center 
          min-w-full
        "
          data-observe
        >
          <p className="text-9xl">atomic</p>
        </div>
      </div>
    </div>
  );
}
