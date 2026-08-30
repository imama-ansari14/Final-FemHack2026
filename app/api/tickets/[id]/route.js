import { NextResponse } from "next/server";

const connectDB = require("../../../../lib/db");
const Ticket = require("../../../../models/Ticket");
const Message = require("../../../../models/Message");
const { getUserFromRequest } = require("../../../../lib/auth");
const {
  emitToTicket,
  emitToAgents,
} = require("../../../../lib/emitSocket");

async function canAccessTicket(user, ticket) {
  // Admin can access every ticket
  if (user.role === "admin") {
    return true;
  }

  // Customer can only access their own tickets
  if (user.role === "customer") {
    if (!ticket.customer) return false;

    const customerId = ticket.customer._id
      ? ticket.customer._id.toString()
      : ticket.customer.toString();

    return customerId === user.id;
  }

  // Agent can ONLY access tickets assigned to them
  if (user.role === "agent") {
    if (!ticket.assignedAgent) {
      return false;
    }

    const agentId = ticket.assignedAgent._id
      ? ticket.assignedAgent._id.toString()
      : ticket.assignedAgent.toString();

    return agentId === user.id;
  }

  return false;
}

/* =========================================================
   GET — Ticket details + conversation
   ========================================================= */

export async function GET(request, { params }) {
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  await connectDB();

  const ticket = await Ticket.findById(params.id)
    .populate("customer", "name email")
    .populate("assignedAgent", "name email");

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found." },
      { status: 404 }
    );
  }

  // Check authorization
  if (!(await canAccessTicket(user, ticket))) {
    return NextResponse.json(
      {
        error:
          "You do not have access to this ticket.",
      },
      { status: 403 }
    );
  }

  const messages = await Message.find({
    ticket: ticket._id,
  })
    .sort({ createdAt: 1 })
    .populate("sender", "name role");

  return NextResponse.json({
    ticket,
    messages,
  });
}

/* =========================================================
   PATCH — Agent reviews/edits AI triage
   ========================================================= */

export async function PATCH(request, { params }) {
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  // Only agents/admins can edit triage
  if (user.role !== "agent" && user.role !== "admin") {
    return NextResponse.json(
      {
        error:
          "Only agents can edit ticket triage.",
      },
      { status: 403 }
    );
  }

  const body = await request.json();

  const {
    category,
    priority,
    summary,
  } = body;

  const VALID_CATEGORIES = [
    "Billing",
    "Technical",
    "Account",
    "Shipping",
    "General",
  ];

  const VALID_PRIORITIES = [
    "Low",
    "Medium",
    "High",
  ];

  await connectDB();

  const ticket = await Ticket.findById(params.id);

  if (!ticket) {
    return NextResponse.json(
      { error: "Ticket not found." },
      { status: 404 }
    );
  }

  /* ---------------------------------------------------------
     IMPORTANT:
     Only the assigned worker can edit the ticket.
     Admin can still edit because admin has global access.
     --------------------------------------------------------- */

  if (user.role === "agent") {
    if (!ticket.assignedAgent) {
      return NextResponse.json(
        {
          error:
            "This ticket has no assigned worker.",
        },
        { status: 403 }
      );
    }

    if (
      ticket.assignedAgent.toString() !== user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Only the assigned worker can edit this ticket.",
        },
        { status: 403 }
      );
    }
  }

  /* ---------------------------------------------------------
     Resolved tickets are permanently locked.
     --------------------------------------------------------- */

  if (ticket.status === "Resolved") {
    return NextResponse.json(
      {
        error:
          "This ticket is already resolved and cannot be changed.",
      },
      { status: 400 }
    );
  }

  /* ---------------------------------------------------------
     Validate category
     --------------------------------------------------------- */

  if (category !== undefined) {
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: "Invalid category.",
        },
        { status: 400 }
      );
    }

    ticket.category = category;
  }

  /* ---------------------------------------------------------
     Validate priority
     --------------------------------------------------------- */

  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        {
          error: "Invalid priority.",
        },
        { status: 400 }
      );
    }

    ticket.priority = priority;
  }

  /* ---------------------------------------------------------
     Validate summary
     --------------------------------------------------------- */

  if (summary !== undefined) {
    if (!summary.trim()) {
      return NextResponse.json(
        {
          error: "Summary cannot be empty.",
        },
        { status: 400 }
      );
    }

    ticket.summary = summary.trim();
  }

  /* ---------------------------------------------------------
     Mark AI suggestion as reviewed
     --------------------------------------------------------- */

  if (
    category !== undefined ||
    priority !== undefined ||
    summary !== undefined
  ) {
    ticket.aiSuggestion.reviewedByAgent = true;
  }

  await ticket.save();

  // Real-time update for ticket page
  emitToTicket(
    ticket._id.toString(),
    "ticket:updated",
    { ticket }
  );

  // Refresh agent dashboards
  emitToAgents(
    "queue:updated",
    {
      ticketId: ticket._id.toString(),
    }
  );

  return NextResponse.json({
    ticket,
  });
}

