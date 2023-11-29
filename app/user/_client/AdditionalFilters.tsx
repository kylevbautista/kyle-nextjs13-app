"use client";

export const AdditionalFilters = () => {
  return (
    <div id="filter">
      <p>Filters</p>
      <div id="filter" className="flex flex-col gap-2">
        <input type="text" defaultValue={"test"}></input>
        <input type="text" defaultValue={"test"}></input>
        <input type="text" defaultValue={"test"}></input>
        <input type="text" defaultValue={"test"}></input>
        <input type="text" defaultValue={"test"}></input>
      </div>
    </div>
  );
};
