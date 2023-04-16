import { GraphQLError } from "graphql";
import UserModel from "@/server/mongodb/models/User";
import { removeFromUserAnimeList } from "./removeFromUserAnimeList";
import base64url from "base64url";

const AnimeList = {
  Query: {
    getUserAnimeList: async (parent: any, args: any, contextValue: any) => {
      // if (!contextValue?.session?.objectId) {
      //   throw new GraphQLError("User is not authenticated", {
      //     extensions: {
      //       code: "UNAUTHENTICATED",
      //       http: { status: 401 },
      //     },
      //   });
      // }
      const sameAcc = args.userParam === contextValue?.session?.user?.email;
      // try {
      //   const users = await UserModel.find({
      //     _id: contextValue?.session?.objectId,
      //   });

      //   return {
      //     list: users[0]?.following,
      //   };
      // } catch (err) {
      //   console.log(err);
      //   return null;
      // }

      try {
        let users: any = [];
        if (sameAcc) {
          users = await UserModel.find({
            _id: contextValue?.session?.objectId,
          });
        } else {
          users = await UserModel.find({
            email: base64url.decode(args.userParam),
          });
        }

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
