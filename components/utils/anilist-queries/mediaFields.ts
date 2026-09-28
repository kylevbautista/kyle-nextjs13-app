/**
 * The AniList Media fields this app renders AND stores.
 *
 * The aliases (upcomingEpisode, upComingAirDate, firstEpisode) are the
 * persistence schema for `users.following[]` entries — see lib/anime/types.ts.
 * Adding a field here also means adding it to lib/anime/normalize.ts
 * (normalizeMedia + MEDIA_SNAPSHOT_FIELDS) or it will be dropped on save.
 */
export const mediaFieldsFragment = `
fragment mediaFields on Media {
  description
  coverImage {
    extraLarge
    large
    medium
    color
  }
  id
  idMal
  season
  seasonYear
  format
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
  externalLinks {
    id
    url
    site
  }
  status
  episodes
  duration
  source
  genres
  averageScore
  popularity
  upcomingEpisode: nextAiringEpisode {
    id
    episode
    timeUntilAiring
    mediaId
  }
  upComingAirDate: airingSchedule(notYetAired: true, page: 1, perPage: 1) {
    episode: nodes {
      airingAt
      timeUntilAiring
      episode
    }
  }
  firstEpisode: airingSchedule(notYetAired: false, page: 1, perPage: 1) {
    episode: nodes {
      airingAt
      episode
    }
  }
}
`;
