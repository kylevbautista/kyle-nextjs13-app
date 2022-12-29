/**
 * Optionl Catch-all dyanmic segment
 * Cacthes:
 * /anime,
 * /anime/year
 * /anime/year/season
 * Then uses regex to verify correct slugs/params
 */

export default async function Anime({ params }: any) {
  const { anime = [] } = params;
  const [year = "", season = ""] = anime;

  return (
    <div>
      <div>animev3</div>
    </div>
  );
}
