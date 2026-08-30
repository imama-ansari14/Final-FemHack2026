import { NextResponse } from "next/server";
const connectDB = require("../../../lib/db");
const User = require("../../../models/User");
const { getUserFromRequest } = require("../../../lib/auth");

export async function GET(request) {
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (user.role !== "customer") {
    return NextResponse.json(
      { error: "Only customers can view available workers." },
      { status: 403 }
    );
  }

  await connectDB();

  const agents = await User.find({
    role: "agent",
  })
    .select("_id name email avatarDataUrl")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({ agents });
}