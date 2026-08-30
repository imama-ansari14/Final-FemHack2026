import { NextResponse } from "next/server";
const connectDB = require("../../../../lib/db");
const User = require("../../../../models/User");
const { getUserFromRequest } = require("../../../../lib/auth");

const MAX_BYTES = 300_000; // ~300KB safety cap since we're storing inline in MongoDB

export async function POST(request) {
  const tokenUser = getUserFromRequest(request);
  if (!tokenUser) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { avatarDataUrl } = await request.json();
  if (!avatarDataUrl || !avatarDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Please upload a valid image." }, { status: 400 });
  }
  if (avatarDataUrl.length > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large. Please use a smaller photo." }, { status: 400 });
  }

  await connectDB();
  const user = await User.findByIdAndUpdate(
    tokenUser.id,
    { avatarDataUrl },
    { new: true }
  ).select("name email role avatarDataUrl");

  return NextResponse.json({ user });
}