import { print as stringifyTag } from "graphql";
import updateUserAnimeData from "./updateUserAnimeDataMutation.graphql";

const updateUserAnimeDataMutation = stringifyTag(updateUserAnimeData);

export { updateUserAnimeDataMutation };
