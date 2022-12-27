// import { getToken } from "next-auth/jwt";
// import TestModel from "../../../../mongodb/models/Test/test";
// import UserModel from "../../../../mongodb/models/User";

const Test2 = {
  Query: {
    test2: async (parent: any, args: any, contextValue: any) => {
      console.log("INSIDE TEST2");
      // console.log("Kylelog", contextValue.req.headers);
      // const req = contextValue.req;
      // const secret = process.env.NEXTAUTH_SECRET;
      // const token = await getToken({ req, secret });
      // console.log("Kylelog sesh", contextValue.session);
      // console.log("Kylelog jwt: ", token);
      try {
        // const poop = await TestModel.create([
        //   {
        //     userId: contextValue.session.objectId,
        //     name: "lmao",
        //     // following: [
        //     //   {
        //     //     testid: "testids",
        //     //   },
        //     // ],
        //   },
        // ]);
        // const poop = await TestModel.find({
        //   userId: contextValue.session.objectId,
        // });
        // const query = {
        //   _id: contextValue?.session?.objectId,
        // };
        // Push without checking for duplicates
        // const updateWO = { $push: { following: { testid: "fuck" } } };

        // Push only if no duplicates
        // const update = {
        //   $addToSet: {
        //     following: {
        //       idMal: 1234,
        //       upComingAirDate: { episode: [{ airingAt: 1234 }] },
        //     },
        //   },
        // };
        // const options = { upsert: true, new: true, setDefaultsOnInsert: true };
        // UserModel.findOneAndUpdate(query, updateWO, options, (error, result) => {
        //   if (error) return;
        //   console.log(result);
        //   // do something with the document
        // });
        // UserModel.findOneAndUpdate(query, update, options, (error, result) => {
        //   if (error) return;
        //   console.log("KYLELOG", result);
        //   // do something with the document
        // });
        const data = {
          id: 2,
          url: "test2",
          input: args?.input ? args.input : "",
        };
        return data;
      } catch (err) {
        console.log(err);
        return null;
      }
    },
  },
};

export default Test2;
