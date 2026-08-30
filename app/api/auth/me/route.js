import { NextResponse } from "next/server";
const connectDB = require("../../../../lib/db");
const User = require("../../../../models/User");
const { getUserFromRequest } = require("../../../../lib/auth");

export async function GET(request) {
  const tokenUser = getUserFromRequest(request);
  if (!tokenUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  await connectDB();
const user = await User.findById(tokenUser.id).select("name email role avatarDataUrl");
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({ user });
}
