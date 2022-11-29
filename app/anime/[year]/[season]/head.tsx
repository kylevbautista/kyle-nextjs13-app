export default function Head({ params }: any) {
  return (
    <>
      <title>{`${params.season} ${params.year} - Anime`}</title>
      <meta
        name="description"
        content={`Anime for the ${params.season} of ${params.year} `}
      ></meta>
    </>
  );
}
