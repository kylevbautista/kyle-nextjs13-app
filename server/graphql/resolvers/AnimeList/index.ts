import { GraphQLError } from "graphql";
import UserModel from "@/server/mongodb/models/User";
import { removeFromUserAnimeList } from "./removeFromUserAnimeList";
import base64url from "base64url";
import dbConnect from "@/server/lib/dbConnect";

const AnimeList = {
  Query: {
    getUserAnimeList: async (parent: any, args: any, contextValue: any) => {
      await dbConnect();
      const sameAcc = args.userParam === contextValue?.session?.user?.email;

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
      await dbConnect();
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
            following: { $elemMatch: { id: args.data.id } },
          }
        );

        const inList = users[0]?.following.length ? true : false;

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
      await dbConnect();
      if (!contextValue?.session?.objectId) {
        throw new GraphQLError("User is not authenticated", {
          extensions: {
            code: "UNAUTHENTICATED",
            http: { status: 401 },
          },
        });
      }
      console.log("Anime List Mutation...");

      let modifiedCount = 0;
      /********************************* */
      // const query = {
      //   _id: contextValue?.session?.objectId,
      // };
      // const updateNew = {
      //   $set: {
      //     following: args.data,
      //   },
      // };
      // const options = { upsert: true, new: true, setDefaultsOnInsert: true };
      /********************************* */

      try {
        if (args?.data) {
          /********************************* */
          // const res = await UserModel.updateOne(query, updateNew, options);
          // // console.log("res", res);
          // if (res?.modifiedCount > 0) {
          //   console.log("Successfully Updated List");
          //   return {
          //     message: "Successfully Updated List",
          //   };
          // }
          /********************************* */
          for (let i = 0; i < args?.data?.length; i++) {
            const currData = args?.data[i];
            const query = {
              _id: contextValue?.session?.objectId,
              "following.id": currData?.id,
            };
            const updateNew = {
              $set: {
                "following.$.description": currData?.description,
                "following.$.coverImage": currData?.coverImage,
                "following.$.id": currData?.id,
                "following.$.idMal": currData?.idMal,
                "following.$.title": currData?.title,
                "following.$.season": currData?.season,
                "following.$.studios": currData?.studios,
                "following.$.startDate": currData?.startDate,
                "following.$.externalLinks": currData?.externalLinks,
                "following.$.status": currData?.status,
                "following.$.episodes": currData?.episodes,
                "following.$.duration": currData?.duration,
                "following.$.source": currData?.source,
                "following.$.genres": currData?.genres,
                "following.$.averageScore": currData?.averageScore,
                "following.$.upcomingEpisode": currData?.upcomingEpisode,
                "following.$.upComingAirDate": currData?.upComingAirDate,
                "following.$.firstEpisode": currData?.firstEpisode,
              },
            };
            const options = {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            };
            const res = await UserModel.updateOne(query, updateNew, options);
            if (res?.acknowledged) {
              modifiedCount = modifiedCount + 1;
            }
          }
        }
        console.log("count", { modifiedCount, datalen: args.data.length });
        if (modifiedCount == args?.data?.length) {
          console.log("Successfully Updated List");
          return {
            message: "Successfully Updated List",
          };
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
