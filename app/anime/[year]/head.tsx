export default function Head({ params }: any) {
  return (
    <>
      <title>{`Anime - ${params.year}`}</title>
      <meta
        name="description"
        content={`Anime for the year ${params.year}`}
      ></meta>
    </>
  );
}
