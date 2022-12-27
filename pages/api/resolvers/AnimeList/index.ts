import UserModel from "../../../../mongodb/models/User";

const AnimeList = {
  Query: {
    getUserAnimeList: async (parent: any, args: any, contextValue: any) => {
      console.log("Anime List Query...");

      try {
        const users = await UserModel.find({
          _id: contextValue?.session?.objectId || "63a6ab800a0b4b52bc40b38d",
        });
        console.log("users", users);
        console.log("following", users[0]?.following);
        console.log("airdate", users[0]?.following[0]?.upComingAirDate);

        return {
          id: 1234,
        };
      } catch (err) {
        console.log(err);
        return null;
      }
    },
  },
  Mutation: {
    addToUserAnimeList: async (parent: any, args: any, contextValue: any) => {
      console.log("Anime List Mutation...");

      const query = {
        _id: contextValue?.session?.objectId || "63a6ab800a0b4b52bc40b38d",
      };
      const update = {
        $addToSet: {
          following: {
            idMal: 12345,
            upComingAirDate: { episode: [{ airingAt: 1237 }] },
          },
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
            _id: contextValue?.session?.objectId || "63a6ab800a0b4b52bc40b38d",
          },
          {
            following: { $elemMatch: { idMal: 12345 } },
          }
        );

        const inList = users[0]?.following.length ? true : false;
        console.log(users[0].following);

        if (!inList) {
          const res = await UserModel.updateOne(query, update, options);
          console.log("res", res);
          if (res?.modifiedCount > 0) {
            return {
              message: "Successfully Added to List",
            };
          }
        }

        return {
          message: "Already In List",
        };
      } catch (err) {
        console.log(err);
        return { message: err };
      }
    },
  },
};

export default AnimeList;
