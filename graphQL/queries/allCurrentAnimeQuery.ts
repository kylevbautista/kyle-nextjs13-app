import { gql } from "graphql-request";

export default gql`
  {
    Page(page: 1, perPage: 5) {
      media(season: FALL, seasonYear: 2022) {
        id
        title {
          romaji
          english
          native
          userPreferred
        }
        startDate {
          year
          month
          day
        }
        status
        episodes
        duration
        nextAiringEpisode {
          id
          episode
          timeUntilAiring
          mediaId
        }
        airingSchedule(notYetAired: true, page: 1, perPage: 1) {
          nodes {
            airingAt
            timeUntilAiring
            episode
            media {
              id
            }
          }
        }
      }
    }
  }
`;
