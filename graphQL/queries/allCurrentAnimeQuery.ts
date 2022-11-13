import { gql } from "graphql-request";

export default gql`
  {
    fall: Page(page: 1, perPage: 50) {
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
    summer: Page(page: 1, perPage: 50) {
      media(season: SUMMER, seasonYear: 2022, sort: POPULARITY_DESC) {
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
    spring: Page(page: 1, perPage: 50) {
      media(season: SPRING, seasonYear: 2022, sort: POPULARITY_DESC) {
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
    winter: Page(page: 1, perPage: 50) {
      media(season: WINTER, seasonYear: 2022, sort: POPULARITY_DESC) {
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