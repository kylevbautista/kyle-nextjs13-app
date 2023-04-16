import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";
import base64url from "base64url";

export const getUserAnimeListOptimized = async ({
  objectId = null,
  userParam = null,
}: any) => {
  if (!userParam) {
    return { data: null };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    // const users = await db
    //   .collection("users")
    //   .find({ _id: new ObjectId(`${objectId}`) })
    //   .toArray();
    const users = await db
      .collection("users")
      .find({ email: base64url.decode(userParam) })
      .toArray();

    const list = users[0]?.following;
    const hasAccount = Boolean(users[0]);

    return {
      data: {
        hasAccount: hasAccount,
        getUserAnimeList: { list },
      },
    };
  } catch (err) {
    console.log(err);
    return { data: null };
  }
};
