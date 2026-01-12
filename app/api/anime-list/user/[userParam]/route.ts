import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import UserModel from "@/server/mongodb/models/User";
import base64url from "base64url";
import dbConnect from "@/server/lib/dbConnect";

export async function GET(
  request: NextRequest,
  { params }: { params: { userParam: string } }
) {
  await dbConnect();

  const session = await getServerSession(authOptions);
  const userParam = params.userParam;

  if (!userParam) {
    return NextResponse.json(
      { error: "User parameter is required" },
      { status: 400 }
    );
  }

  try {
    const sameAcc = userParam === session?.user?.email;
    let users: any = [];

    if (sameAcc && session?.objectId) {
      users = await UserModel.find({
        _id: session.objectId,
      });
    } else {
      users = await UserModel.find({
        email: base64url.decode(userParam),
      });
    }

    return NextResponse.json({
      list: users[0]?.following || [],
    });
  } catch (err) {
    console.error("Error fetching user anime list:", err);
    return NextResponse.json(
      { error: "Failed to fetch anime list" },
      { status: 500 }
    );
  }
}
