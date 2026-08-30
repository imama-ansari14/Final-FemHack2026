import { NextResponse } from "next/server";

const connectDB = require("../../../lib/db");
const Notification = require("../../../models/Notification");
const { getUserFromRequest } = require("../../../lib/auth");

export async function GET(request) {
    const user = getUserFromRequest(request);

    if (!user) {
        return NextResponse.json(
            { error: "Not authenticated." },
            { status: 401 }
        );
    }

    await connectDB();

    const notifications = await Notification.find({
        user: user.id,
    })
        .populate("ticket", "ticketNumber subject status")
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();

    return NextResponse.json({
        notifications,
    });
}

export async function PATCH(request) {
    const user = getUserFromRequest(request);

    if (!user) {
        return NextResponse.json(
            { error: "Not authenticated." },
            { status: 401 }
        );
    }

    const { id } = await request.json();

    if (!id) {
        return NextResponse.json(
            { error: "Notification ID is required." },
            { status: 400 }
        );
    }

    await connectDB();

    const notification =
        await Notification.findOneAndUpdate(
            {
                _id: id,
                user: user.id,
            },
            {
                read: true,
            },
            {
                new: true,
            }
        );

    if (!notification) {
        return NextResponse.json(
            { error: "Notification not found." },
            { status: 404 }
        );
    }

    return NextResponse.json({
        notification,
    });
}

