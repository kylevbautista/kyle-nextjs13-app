import graphqlNextHandler from "@/server/graphql";
import dbConnect from "@/server/lib/dbConnect";

export async function GET(request: any) {
  await dbConnect();
  return graphqlNextHandler(request);
}

export async function POST(request: any) {
  await dbConnect();
  return graphqlNextHandler(request);
}
