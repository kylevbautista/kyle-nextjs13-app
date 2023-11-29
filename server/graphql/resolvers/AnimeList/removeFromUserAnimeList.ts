import { GraphQLError } from "graphql";
import UserModel from "../../../mongodb/models/User";
import dbConnect from "@/server/lib/dbConnect";

export const removeFromUserAnimeList = async (
  parent: any,
  args: any,
  contextValue: any
) => {
  await dbConnect();
  if (!contextValue?.session?.objectId) {
    throw new GraphQLError("User is not authenticated", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const query = {
    _id: contextValue?.session?.objectId,
  };
  const updateRemove = {
    $pull: {
      following: { id: args.data.id },
    },
  };
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };

  try {
    const users = await UserModel.find(
      {
        _id: contextValue?.session?.objectId,
      },
      {
        following: { $elemMatch: { id: args.data.id } },
      }
    );
    const inList = users[0]?.following.length ? true : false;

    if (inList && args?.data) {
      const res = await UserModel.updateOne(query, updateRemove, options);
      // console.log("res", res);
      if (res?.modifiedCount > 0) {
        console.log("Successfully Removed From List");
        return {
          message: "Successfully Removed From List",
        };
      }
    }

    console.log("Did Not Remove");
    return {
      message: "Did Not Remove",
    };
  } catch (err) {
    console.log(err);
    return { message: err };
  }
};
