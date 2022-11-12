"use client";
import { getSeasonNow } from "../../jinkan/seasonNow";
import { useState, useEffect } from "react";

export default function Button() {
  const onClick = async () => {
    try {
      const data = await getSeasonNow();
      console.log(data);
    } catch (err) {
      console.log("error", err);
    }
  };
  return (
    <button
      onClick={onClick}
      className="rounded-2xl bg-blue-800 hover:shadow-md hover:shadow-white max-w-max max-h-max"
    >
      Button
    </button>
  );
}
