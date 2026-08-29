import { NextResponse } from "next/server";
const { getUserFromRequest } = require("../../../../lib/auth");
const { triageTicket } = require("../../../../lib/gemini");

export async function POST(request) {
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { subject, description } = await request.json();
    if (!subject?.trim() && !description?.trim()) {
        return NextResponse.json({ category: "", priority: "", summary: "" });
    }

    const result = await triageTicket({ subject: subject || "", description: description || "" });
    return NextResponse.json(result);
}