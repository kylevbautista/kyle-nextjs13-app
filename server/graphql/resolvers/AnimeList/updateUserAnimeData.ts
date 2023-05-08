import { GraphQLError } from "graphql";
import UserModel from "@/server/mongodb/models/User";
import base64url from "base64url";

export const updateUserAnimeData = async (
  parent: any,
  args: any,
  contextValue: any
) => {
  console.log(args?.data?.userData);
  console.log(args?.data?.animeId);
  //_id: contextValue?.session?.objectId
  console.log(contextValue?.session?.objectId);
  try {
    const query = {
      _id: contextValue?.session?.objectId,
      "following.id": parseInt(args?.data?.animeId),
    };
    const updateNew = {
      $set: {
        "following.$.userData": args?.data?.userData,
      },
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    const res = await UserModel.updateOne(query, updateNew, options);
    console.log(res);
    return {
      message: "Successfull Mutation",
    };
  } catch (err) {
    console.log(err);
    return {
      message: "Error Updaing User Anime Data",
    };
  }
};
