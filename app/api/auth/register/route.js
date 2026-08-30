import { NextResponse } from "next/server";
const connectDB = require("../../../../lib/db");
const User = require("../../../../models/User");
const { hashPassword, signToken, COOKIE_NAME } = require("../../../../lib/auth");

export async function POST(request) {
  try {
    const { name, email, password, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // Only allow customer/agent self-signup. Admin accounts should be
    // created directly in the database or seeded, not via public signup.
    const safeRole = role === "agent" ? "agent" : "customer";

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: safeRole,
    });

    const token = signToken({ id: user._id.toString(), role: user.role, name: user.name });

    const response = NextResponse.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
