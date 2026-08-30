import { NextResponse } from "next/server";
const connectDB = require("../../../lib/db");
const Ticket = require("../../../lib/../models/Ticket");
const { getUserFromRequest } = require("../../../lib/auth");

export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role === "customer") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  await connectDB();

  const [total, byStatus, byPriority, byCategory, resolved] = await Promise.all([
    Ticket.countDocuments({}),
    Ticket.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    Ticket.find({ status: "Resolved", resolvedAt: { $ne: null } }).select("createdAt resolvedAt"),
  ]);

  const avgResolutionHours =
    resolved.length > 0
      ? resolved.reduce((sum, t) => sum + (t.resolvedAt - t.createdAt) / 36e5, 0) / resolved.length
      : 0;

  const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.count]));

  return NextResponse.json({
    total,
    byStatus: toMap(byStatus),
    byPriority: toMap(byPriority),
    byCategory: toMap(byCategory),
    avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
  });
}
