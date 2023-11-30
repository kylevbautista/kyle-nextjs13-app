"use client";

import { useBearStore } from "@/stores/user/userStore";

export const AdditionalFilters = () => {
  const updateFilterBy = useBearStore((state: any) => state.updateFilterBy);

  return (
    <div id="filter">
      <p>Filters</p>
      <div id="filter" className="flex flex-col gap-2">
        <select
          name="selectedYear"
          id="selected-year"
          defaultValue={0}
          onChange={(e) => {
            updateFilterBy({ year: parseInt(e.target.value) });
          }}
        >
          <option value="0">All Years</option>
          <option value={2018}>2018</option>
          <option value={2019}>2019</option>
          <option value={2020}>2020</option>
          <option value={2021}>2021</option>
          <option value={2022}>2022</option>
          <option value={2023}>2023</option>
          <option value={2024}>2024</option>
        </select>
        <select
          name="selectedSeason"
          id="selected-season"
          defaultValue={"all"}
          onChange={(e) => {
            updateFilterBy({ season: e.target.value });
          }}
        >
          <option value="all">All Seasons</option>
          <option value="WINTER">Winter</option>
          <option value="SPRING">Spring</option>
          <option value="SUMMER">Summer</option>
          <option value="FALL">Fall</option>
        </select>
        <select
          name="selectedDay"
          id="selected-day"
          defaultValue={"none"}
          onChange={(e) => {
            updateFilterBy({ day: e.target.value });
          }}
        >
          <option value="all">All Days</option>
          <option value="monday">Monday</option>
          <option value="tuesday">Tuesday</option>
          <option value="wednesday">Wednesday</option>
          <option value="thursday">Thursday</option>
          <option value="friday">Friday</option>
          <option value="saturday">Saturday</option>
          <option value="sunday">Sunday</option>
        </select>
        <select
          name="selectedstatus"
          id="selected-status"
          defaultValue={"all"}
          onChange={(e) => {
            updateFilterBy({ status: e.target.value });
          }}
        >
          <option value="all">Release Status</option>
          <option value="RELEASING">Airing</option>
          <option value="FINISHED">Finished</option>
          <option value="NOT_YET_RELEASED">Unreleased</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="HIATUS">Hiatus</option>
        </select>
      </div>
    </div>
  );
};
