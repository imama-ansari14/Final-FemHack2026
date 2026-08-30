import { NextResponse } from "next/server";
const connectDB = require("../../../../lib/db");
const Ticket = require("../../../../models/Ticket");
const Message = require("../../../../models/Message");
const { getUserFromRequest } = require("../../../../lib/auth");
const { emitToTicket, emitToAgents } = require("../../../../lib/emitSocket");

async function canAccessTicket(user, ticket) {
  if (user.role === "admin") return true;
  if (user.role === "customer") return ticket.customer.toString() === user.id;
  if (user.role === "agent") {
    return !ticket.assignedAgent || ticket.assignedAgent.toString() === user.id;
  }
  return false;
}

export async function GET(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  await connectDB();
  const ticket = await Ticket.findById(params.id)
    .populate("customer", "name email")
    .populate("assignedAgent", "name email");

  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  if (!(await canAccessTicket(user, ticket))) {
    return NextResponse.json({ error: "You do not have access to this ticket." }, { status: 403 });
  }

  const messages = await Message.find({ ticket: ticket._id })
    .sort({ createdAt: 1 })
    .populate("sender", "name role");

  return NextResponse.json({ ticket, messages });
}

// PATCH /api/tickets/:id - agent reviews/edits AI suggestion and/or claims the ticket
export async function PATCH(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "agent" && user.role !== "admin") {
    return NextResponse.json({ error: "Only agents can edit ticket triage." }, { status: 403 });
  }

  const body = await request.json();
  const { category, priority, summary, claim } = body;

  const VALID_CATEGORIES = ["Billing", "Technical", "Account", "Shipping", "General"];
  const VALID_PRIORITIES = ["Low", "Medium", "High"];

  await connectDB();
  const ticket = await Ticket.findById(params.id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });

  if (ticket.status === "Resolved") {
    return NextResponse.json(
      { error: "This ticket is resolved. Reopen it before making changes." },
      { status: 400 }
    );
  }

  // Validate AI-reviewed fields before storing (business rule: AI output must be validated)
  if (category !== undefined) {
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
    ticket.category = category;
  }
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }
    ticket.priority = priority;
  }
  if (summary !== undefined) {
    if (!summary.trim()) {
      return NextResponse.json({ error: "Summary cannot be empty." }, { status: 400 });
    }
    ticket.summary = summary.trim();
  }
  if (category !== undefined || priority !== undefined || summary !== undefined) {
    ticket.aiSuggestion.reviewedByAgent = true;
  }

  if (claim) {
    if (ticket.assignedAgent && ticket.assignedAgent.toString() !== user.id) {
      return NextResponse.json({ error: "This ticket is already assigned to another agent." }, { status: 409 });
    }
    ticket.assignedAgent = user.id;
    if (ticket.status === "New") ticket.status = "Assigned";
  }

  await ticket.save();

  emitToTicket(ticket._id.toString(), "ticket:updated", { ticket });
  emitToAgents("ticket:updated", { ticketId: ticket._id.toString() });

  return NextResponse.json({ ticket });
}
