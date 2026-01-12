import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import UserModel from "@/server/mongodb/models/User";
import dbConnect from "@/server/lib/dbConnect";

export async function POST(request: NextRequest) {
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
    const data = body.data;

    if (!data) {
      return NextResponse.json(
        { error: "Anime data is required" },
        { status: 400 }
      );
    }

    const query = {
      _id: session.objectId,
    };

    // Check if anime already exists in list
    const users = await UserModel.find(query, {
      following: { $elemMatch: { id: data.id } },
    });

    const inList = users[0]?.following?.length > 0;

    if (inList) {
      return NextResponse.json({
        message: "Already In List",
      });
    }

    // Add to list
    const update = {
      $addToSet: {
        following: data,
      },
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const res = await UserModel.updateOne(query, update, options);

    if (res?.modifiedCount > 0) {
      console.log("Successfully Added to List");
      return NextResponse.json({
        message: "Successfully Added to List",
      });
    }

    return NextResponse.json({
      message: "Already In List",
    });
  } catch (err) {
    console.error("Error adding to anime list:", err);
    return NextResponse.json(
      { error: "Failed to add anime to list" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const data = body.data;

    if (!data || !data.id) {
      return NextResponse.json(
        { error: "Anime data with id is required" },
        { status: 400 }
      );
    }

    const query = {
      _id: session.objectId,
    };

    // Check if anime exists in list
    const users = await UserModel.find(query, {
      following: { $elemMatch: { id: data.id } },
    });

    const inList = users[0]?.following?.length > 0;

    if (!inList) {
      return NextResponse.json({
        message: "Did Not Remove",
      });
    }

    // Remove from list
    const updateRemove = {
      $pull: {
        following: { id: data.id },
      },
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };

    const res = await UserModel.updateOne(query, updateRemove, options);

    if (res?.modifiedCount > 0) {
      console.log("Successfully Removed From List");
      return NextResponse.json({
        message: "Successfully Removed From List",
      });
    }

    return NextResponse.json({
      message: "Did Not Remove",
    });
  } catch (err) {
    console.error("Error removing from anime list:", err);
    return NextResponse.json(
      { error: "Failed to remove anime from list" },
      { status: 500 }
    );
  }
}
