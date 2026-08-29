import { NextResponse } from "next/server";
const connectDB = require("../../../../../lib/db");
const Ticket = require("../../../../../models/Ticket");
const { getUserFromRequest } = require("../../../../../lib/auth");

export async function POST(request, { params }) {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    if (user.role !== "customer") {
        return NextResponse.json({ error: "Only the customer who filed the ticket can review it." }, { status: 403 });
    }

    const { rating, comment } = await request.json();
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
        return NextResponse.json({ error: "Rating must be a whole number from 1 to 5." }, { status: 400 });
    }

    await connectDB();
    const ticket = await Ticket.findById(params.id);
    if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    if (ticket.customer.toString() !== user.id) {
        return NextResponse.json({ error: "This is not your ticket." }, { status: 403 });
    }
    if (ticket.status !== "Resolved") {
        return NextResponse.json({ error: "You can only review a completed ticket." }, { status: 400 });
    }
    if (ticket.review?.rating) {
        return NextResponse.json({ error: "You already reviewed this ticket." }, { status: 400 });
    }

    ticket.review = {
        rating: numericRating,
        comment: comment?.trim() || "",
        reviewedAt: new Date(),
    };
    await ticket.save();

    return NextResponse.json({ ticket });
}