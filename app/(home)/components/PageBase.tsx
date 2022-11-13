import React, { FunctionComponent, ReactNode } from "react";
import Grid from "../../common/Grid";
import Box from "../../common/Box";
import AnimeInfoGrid from "./AnimeInfoGrid";

interface PageBaseProps {
  data?: any;
  children?: ReactNode;
}

interface graphQLPageType {
  media: [];
}

export default function PageBase({ data, children }: PageBaseProps) {
  const { Page }: { Page: graphQLPageType } = data || {};
  const { media } = Page || {};

  return (
    <div
      id="container"
      className="
        flex 
        flex-col 
        justify-center 
        items-center 
        sm:p-4
      "
    >
      <Grid>
        {media?.map((info: any, index: number) => (
          <AnimeInfoGrid key={index} id={index} info={info} />
        ))}
      </Grid>
    </div>
  );
}
