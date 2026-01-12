import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth";
import UserModel from "@/server/mongodb/models/User";
import dbConnect from "@/server/lib/dbConnect";

export async function PATCH(request: NextRequest) {
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

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Data must be an array of anime items" },
        { status: 400 }
      );
    }

    let modifiedCount = 0;

    // Update each anime item in the list
    for (let i = 0; i < data.length; i++) {
      const currData = data[i];
      const query = {
        _id: session.objectId,
        "following.id": currData?.id,
      };
      const updateNew = {
        $set: {
          "following.$.description": currData?.description,
          "following.$.coverImage": currData?.coverImage,
          "following.$.id": currData?.id,
          "following.$.idMal": currData?.idMal,
          "following.$.title": currData?.title,
          "following.$.season": currData?.season,
          "following.$.studios": currData?.studios,
          "following.$.startDate": currData?.startDate,
          "following.$.externalLinks": currData?.externalLinks,
          "following.$.status": currData?.status,
          "following.$.episodes": currData?.episodes,
          "following.$.duration": currData?.duration,
          "following.$.source": currData?.source,
          "following.$.genres": currData?.genres,
          "following.$.averageScore": currData?.averageScore,
          "following.$.upcomingEpisode": currData?.upcomingEpisode,
          "following.$.upComingAirDate": currData?.upComingAirDate,
          "following.$.firstEpisode": currData?.firstEpisode,
        },
      };
      const options = {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      };
      const res = await UserModel.updateOne(query, updateNew, options);
      if (res?.acknowledged) {
        modifiedCount = modifiedCount + 1;
      }
    }

    console.log("count", { modifiedCount, datalen: data.length });

    if (modifiedCount === data.length) {
      console.log("Successfully Updated List");
      return NextResponse.json({
        message: "Successfully Updated List",
      });
    }

    return NextResponse.json({
      message: "Partially Updated List",
      modifiedCount,
      totalCount: data.length,
    });
  } catch (err) {
    console.error("Error bulk updating anime list:", err);
    return NextResponse.json(
      { error: "Failed to bulk update anime list" },
      { status: 500 }
    );
  }
}
