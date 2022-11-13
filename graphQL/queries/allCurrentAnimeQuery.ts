import { gql } from "graphql-request";

export default gql`
  {
    Page(page: 1, perPage: 50) {
      media(season: FALL, seasonYear: 2022, sort: POPULARITY_DESC) {
        description
        coverImage {
          extraLarge
          large
          medium
          color
        }
        idMal
        title {
          romaji
          english
          native
        }
        studios(isMain: true) {
          nodes {
            name
          }
        }
        startDate {
          year
          month
          day
        }
        status
        episodes
        duration
        source
        genres
        averageScore
        upcomingEpisode: nextAiringEpisode {
          id
          episode
          timeUntilAiring
          mediaId
        }
        firstEpisode: airingSchedule(notYetAired: false, page: 1, perPage: 1) {
          episode: nodes {
            airingAt
            episode
          }
        }
      }
    }
  }
`;
