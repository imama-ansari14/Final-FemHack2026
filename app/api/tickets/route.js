import { NextResponse } from "next/server";
const connectDB = require("../../../lib/db");
const Ticket = require("../../../models/Ticket");
const User = require("../../../models/User");
const { getUserFromRequest } = require("../../../lib/auth");
const { triageTicket } = require("../../../lib/gemini");
const { generateTicketNumber } = require("../../../lib/utils");
const { emitToAgents } = require("../../../lib/emitSocket");

// GET /api/tickets - list tickets scoped to the logged-in user's role
export async function GET(request) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  await connectDB();

  let query = {};
  if (user.role === "customer") {
    query = { customer: user.id };
  } else if (user.role === "agent") {
    query = { assignedAgent: user.id };
  }

  // admin sees everything (empty query)
  const tickets = await Ticket.find(query)
    .sort({ createdAt: -1 })
    .populate("customer", "name email")
    .populate("assignedAgent", "name email")
    .lean();

  return NextResponse.json({ tickets });
}

// POST /api/tickets - customer creates a ticket, AI triages it immediately

export async function POST(request) {
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (user.role !== "customer") {
    return NextResponse.json(
      { error: "Only customers can create tickets." },
      { status: 403 }
    );
  }

  try {
    const {
      subject,
      description,
      category,
      assignedAgent,
    } = await request.json();

    if (!subject?.trim() || !description?.trim()) {
      return NextResponse.json(
        {
          error: "Subject and description are required.",
        },
        { status: 400 }
      );
    }

    if (!assignedAgent) {
      return NextResponse.json(
        {
          error: "Please select a worker.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify selected worker actually exists and is an agent.
    const agent = await User.findOne({
      _id: assignedAgent,
      role: "agent",
    }).select("_id name");

    if (!agent) {
      return NextResponse.json(
        {
          error: "Selected worker is not available.",
        },
        { status: 400 }
      );
    }

    // AI triage.
    // It always returns a safe fallback if Gemini fails.
    const aiResult = await triageTicket({
      subject,
      description,
    });

    const finalCategory =
      category?.trim() || aiResult.category;

    const ticket = await Ticket.create({
      ticketNumber: generateTicketNumber(),

      subject: subject.trim(),
      description: description.trim(),

      customer: user.id,

      // Customer selected worker.
      assignedAgent: agent._id,

      // Customer's category wins if manually selected.
      // Otherwise use AI suggestion.
      category: finalCategory,

      priority: aiResult.priority,
      summary: aiResult.summary,

      // Because a worker was selected during creation.
      status: "Assigned",

      aiSuggestion: {
        category: aiResult.category,
        priority: aiResult.priority,
        summary: aiResult.summary,
        aiAvailable: aiResult.aiAvailable,
        reviewedByAgent: false,
      },
    });

    // Tell all agents that their queue/data may have changed.
    emitToAgents("ticket:new", {
      ticketId: ticket._id.toString(),
    });

    return NextResponse.json(
      { ticket },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create ticket error:", err);

    return NextResponse.json(
      {
        error:
          "Could not create ticket. Please try again.",
      },
      { status: 500 }
    );
  }
}
