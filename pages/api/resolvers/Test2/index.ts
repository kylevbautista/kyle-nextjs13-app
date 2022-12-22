const Test2 = {
  Query: {
    test2: async (parent: any, args: any, contextValue: any) => {
      // console.log("Kylelog", contextValue.req.headers);
      try {
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
