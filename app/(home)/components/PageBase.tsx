import FlexBox from "../../common/FlexBox";
import React, { FunctionComponent, ReactNode } from "react";
import Button from "./Button";
import Card from "../../common/Card";
import CardGrid from "../../common/CardGrid";
import Grid from "../../common/Grid";
import Box from "../../common/Box";
import AnimeInfoGrid from "./AnimeInfoGrid";

interface PageBaseProps {
  data?: any;
  children?: ReactNode;
}

export default function PageBase({ data, children }: PageBaseProps) {
  const { data: dataArray } = data || {};

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
        {/* <Button></Button> */}
        {/* {dataArray.map((info: any, index: number) => (
          <CardGrid key={index} id={index} info={info} />
        ))} */}
        {dataArray.map((info: any, index: number) => (
          <AnimeInfoGrid key={index} id={index} info={info} />
        ))}
        {/* <AnimeInfoGrid /> */}
      </Grid>
    </div>
  );
}
