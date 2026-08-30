const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const COOKIE_NAME = "supportflow_token";
const JWT_SECRET = process.env.JWT_SECRET;

function signToken(payload) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not set. Add it to .env.local");
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Reads the JWT from the cookie header of a Next.js Request object (App Router).
function getUserFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const token = match.split("=")[1];
  return verifyToken(token);
}

module.exports = {
  COOKIE_NAME,
  signToken,
  verifyToken,
  hashPassword,
  comparePassword,
  getUserFromRequest,
};
