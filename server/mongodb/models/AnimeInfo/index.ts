import mongoose, { Schema } from "mongoose";

const AnimeInfoScheme = new Schema(
  {
    description: { type: String, default: null },
    coverImage: {
      _id: false,
      extraLarge: { type: String, default: null },
      large: { type: String, default: null },
      medium: { type: String, default: null },
      color: { type: String, default: null },
    },
    id: { type: Number },
    idMal: { type: Number },
    title: {
      _id: false,
      romaji: { type: String, default: null },
      english: { type: String, default: null },
      native: { type: String, default: null },
    },
    studios: {
      _id: false,
      nodes: [
        {
          _id: false,
          name: { type: String, default: null },
        },
      ],
    },
    startDate: {
      _id: false,
      year: { type: Number, default: null },
      month: { type: Number, default: null },
      day: { type: Number, default: null },
    },
    externalLinks: [
      {
        _id: false,
        id: { type: Number, default: null },
        url: { type: String, default: null },
        site: { type: String, default: null },
      },
    ],
    status: { type: String, default: null },
    episodes: { type: Number, default: null },
    duration: { type: Number, default: null },
    source: { type: String, default: null },
    genres: [{ type: String, default: null }],
    averageScore: { type: Number, default: null },
    upcomingEpisode: {
      _id: false,
      id: { type: Number, default: null },
      episode: { type: Number, default: null },
      timeUntilAiring: { type: Number, default: null },
      mediaId: { type: Number, default: null },
    },
    upComingAirDate: {
      _id: false,
      episode: [
        {
          _id: false,
          airingAt: { type: Number, default: null },
          timeUntilAiring: { type: Number, default: null },
          episode: { type: Number, default: null },
        },
      ],
    },
    firstEpisode: {
      _id: false,
      episode: [
        {
          _id: false,
          airingAt: { type: Number, default: null },
          episode: { type: Number, default: null },
        },
      ],
    },
    userData: {
      _id: false,
      listType: { type: String, default: "watching" },
      episodeProgressNumber: { type: Number, default: 0 },
      startDate: { type: Number, default: null },
      finishDate: { type: Number, default: null },
      score: { type: Number, default: null },
    },
  },
  { _id: false }
);

// const AnimeInfoModel = mongoose.model("animeinfo", AnimeInfoScheme);
// export default AnimeInfoModel;

/**
 * Using GraphQL Playground causing some schema redfinitions.
 * Code Below is to handle this case.
 */
let AnimeInfoModel: any;
try {
  AnimeInfoModel = mongoose.model("animeinfo");
} catch (error) {
  AnimeInfoModel = mongoose.model("animeinfo", AnimeInfoScheme);
}

export default AnimeInfoModel;
