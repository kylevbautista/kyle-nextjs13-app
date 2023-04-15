import clientPromise from "../mongodb";
import { ObjectId } from "mongodb";

export const getUserAnimeListOptimized = async ({
  objectId = null,
  email = null,
}: any) => {
  if (!objectId) {
    return { data: null };
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    // const users = await db
    //   .collection("users")
    //   .find({ _id: new ObjectId(`${objectId}`) })
    //   .toArray();
    const users = await db.collection("users").find({ email: email }).toArray();

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
