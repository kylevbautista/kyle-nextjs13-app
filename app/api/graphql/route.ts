import graphqlNextHandler from "@/server/graphql";
import { NextRequest } from "next/server";
import dbConnect from "@/server/lib/dbConnect";

export async function GET(request: NextRequest) {
  await dbConnect();

  const response = await graphqlNextHandler(request);
  // response.headers.set("Access-Control-Allow-Origin", "*");
  // response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  // response.headers.set(
  //   "Access-Control-Allow-Headers",
  //   "Content-Type, Authorization"
  // );
  // response.headers.set("Access-Control-Allow-Credentials", "true");

  return response;
}

export async function POST(request: NextRequest) {
  await dbConnect();

  const response = await graphqlNextHandler(request);
  // response.headers.set("Access-Control-Allow-Origin", "*");
  // response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  // response.headers.set(
  //   "Access-Control-Allow-Headers",
  //   "Content-Type, Authorization"
  // );
  // response.headers.set("Access-Control-Allow-Credentials", "true");

  return response;
}
