import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import UserModel from "@/server/mongodb/models/User";
import dbConnect from "@/server/lib/dbConnect";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { animeId: string } }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);

  if (!session?.objectId) {
    return NextResponse.json(
      { error: "User is not authenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const userData = body.userData;
    const animeId = parseInt(params.animeId);

    if (!userData || !animeId) {
      return NextResponse.json(
        { error: "User data and anime ID are required" },
        { status: 400 }
      );
    }

    const query = {
      _id: session.objectId,
      "following.id": animeId,
    };

    const updateNew = {
      $set: {
        "following.$.userData": userData,
      },
    };

    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const res = await UserModel.updateOne(query, updateNew, options);

    console.log("Update user anime data result:", res);

    return NextResponse.json({
      message: "Successfully Updated User Anime Data",
    });
  } catch (err) {
    console.error("Error updating user anime data:", err);
    return NextResponse.json(
      { error: "Error Updating User Anime Data" },
      { status: 500 }
    );
  }
}
