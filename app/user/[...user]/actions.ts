"use server";
import clientPromise from "@/server/lib/mongodb";
import base64url from "base64url";

export const serverFunction = async (formData: FormData) => {
  console.log("server function", formData.get("episodeNumber"));
  console.log("server function", formData.get("userParam"));
  try {
    const client = await clientPromise;
    const db = client.db();

    const query = {
      /* @ts-ignore */
      email: base64url.decode(formData.get("userParam")),
      /* @ts-ignore */
      "following.id": parseInt(formData.get("animeId")),
    };

    const updateNew = {
      $set: {
        "following.$.userData.episodeProgressNumber":
          /* @ts-ignore */
          parseInt(formData.get("episodeNumber")) + 1,
      },
    };

    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const res = await db
      .collection("users")
      .updateOne(query, updateNew, options);
  } catch (err) {
    console.log(err);
  }
};
