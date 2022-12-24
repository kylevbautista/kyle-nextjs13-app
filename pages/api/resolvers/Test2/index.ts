import { getToken } from "next-auth/jwt";
import TestModel from "../../../../mongodb/models/Test/test";

const Test2 = {
  Query: {
    test2: async (parent: any, args: any, contextValue: any) => {
      // console.log("Kylelog", contextValue.req.headers);
      // const req = contextValue.req;
      // const secret = process.env.NEXTAUTH_SECRET;
      // const token = await getToken({ req, secret });
      // console.log("Kylelog sesh", contextValue.session);
      // console.log("Kylelog jwt: ", token);
      try {
        const poop = await TestModel.create([{ name: "uhh" }]);
        // const poop = await TestModel.find({
        //   userId: contextValue.session.objectId,
        // });
        console.log("poop", poop);
        const data = {
          id: 2,
          url: "test2",
          input: args?.input ? args.input : "",
        };
        return data;
      } catch (err) {
        return null;
      }
    },
  },
};

export default Test2;
