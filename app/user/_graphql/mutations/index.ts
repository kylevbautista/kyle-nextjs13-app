import { print as stringifyTag } from "graphql";
import updateUserAnimeData from "./updateUserAnimeDataMutation.graphql";
import removeFromUserAnimeList from "./removeFromUserAnimeList.graphql";

const updateUserAnimeDataMutation = stringifyTag(updateUserAnimeData);
const removeFromUserAnimeListMutation = stringifyTag(removeFromUserAnimeList);

export { updateUserAnimeDataMutation, removeFromUserAnimeListMutation };
