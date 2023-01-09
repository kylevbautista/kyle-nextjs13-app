export default function Head({ params }: any) {
  const { anime = [] } = params;
  const [year = "", season = ""] = anime;
  return (
    <>
      <title>{`${season} ${year} - Anime`}</title>
      <meta
        name="description"
        content={`Anime for the ${season} of ${year} `}
      ></meta>
    </>
  );
}
