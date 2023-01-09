"use client";
import { ReactNode, useContext } from "react";
import Grid from "../common/Grid";
import AnimeInfoGrid from "../animev3/AnimeInfoGrid";
import { getInitialTimes } from "../animev3/helpers";
import { HeaderContext } from "./layout/HeaderProvider";

interface PageBaseProps {
  list?: any;
  session?: any;
  children?: ReactNode;
}

export function List({ list }: PageBaseProps) {
  const header = useContext(HeaderContext);
  const { option, setOption } = header;
  return (
    <>
      {list.length && (
        <Grid>
          {list?.map((info: any, index: number) => (
            <AnimeInfoGrid
              key={info.idMal}
              id={index}
              info={info}
              initialTimes={getInitialTimes(
                info?.upcomingEpisode?.timeUntilAiring
              )}
              option={option}
            />
          ))}
        </Grid>
      )}
    </>
  );
}
