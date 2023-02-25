"use client";

export default function Button() {
  const onClick = () => {
    console.log("error");
  };
  return (
    <>
      <button
        onClick={onClick}
        className="rounded-2xl bg-blue-800 hover:shadow-md hover:shadow-white max-w-max max-h-max"
      >
        Button
      </button>
    </>
  );
}
