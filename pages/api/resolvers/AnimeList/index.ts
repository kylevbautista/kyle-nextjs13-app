import { GraphQLError } from "graphql";
import UserModel from "../../../../mongodb/models/User";
import { removeFromUserAnimeList } from "./removeFromUserAnimeList";

const AnimeList = {
  Query: {
    getUserAnimeList: async (parent: any, args: any, contextValue: any) => {
      if (!contextValue?.session?.objectId) {
        throw new GraphQLError("User is not authenticated", {
          extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
          },
        });
      }

      try {
        const users = await UserModel.find({
          _id: contextValue?.session?.objectId,
        });

        return {
          list: users[0]?.following,
        };
      } catch (err) {
        console.log(err);
        return null;
      }
    },
  },
  Mutation: {
    addToUserAnimeList: async (parent: any, args: any, contextValue: any) => {
      if (!contextValue?.session?.objectId) {
        throw new GraphQLError("User is not authenticated", {
          extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
          },
        });
      }
      console.log("Anime List Mutation...");

      const query = {
        _id: contextValue?.session?.objectId,
      };
      const update = {
        $addToSet: {
          following: args?.data,
        },
      };
      const options = { upsert: true, new: true, setDefaultsOnInsert: true };

      try {
        // const res = UserModel.findOneAndUpdate(
        //   query,
        //   update,
        //   options,
        //   (error: any, result: any) => {
        //     if (error) return;
        //     console.log("KYLELOG", result);
        //     // do something with the document
        //   }
        // );
        // console.log("res", res);
        // const res = await UserModel.findOneAndUpdate(query, update, options);

        const users = await UserModel.find(
          {
            _id: contextValue?.session?.objectId,
          },
          {
            following: { $elemMatch: { idMal: args.data.idMal } },
          }
        );

        const inList = users[0]?.following.length ? true : false;
        // console.log(users[0].following);
        // console.log("args", args);

        if (!inList && args?.data) {
          const res = await UserModel.updateOne(query, update, options);
          // console.log("res", res);
          if (res?.modifiedCount > 0) {
            console.log("Successfully Added to List");
            return {
              message: "Successfully Added to List",
            };
          }
        }

        console.log("Already In List");
        return {
          message: "Already In List",
        };
      } catch (err) {
        console.log(err);
        return { message: err };
      }
    },
    updateUserAnimeList: async (parent: any, args: any, contextValue: any) => {
      if (!contextValue?.session?.objectId) {
        throw new GraphQLError("User is not authenticated", {
          extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
          },
        });
      }
      console.log("Anime List Mutation...");

      const query = {
        _id: contextValue?.session?.objectId,
      };
      const updateNew = {
        $set: {
          following: args.data,
        },
      };
      const options = { upsert: true, new: true, setDefaultsOnInsert: true };

      try {
        const users = await UserModel.find({
          _id: contextValue?.session?.objectId,
        });

        if (args?.data) {
          const res = await UserModel.updateOne(query, updateNew, options);
          // console.log("res", res);
          if (res?.modifiedCount > 0) {
            console.log("Successfully Updated List");
            return {
              message: "Successfully Updated List",
            };
          }
        }

        console.log("Already In List");
        return {
          message: "Already In List",
        };
      } catch (err) {
        console.log(err);
        return { message: err };
      }
    },
    removeFromUserAnimeList,
  },
};

export default AnimeList;
