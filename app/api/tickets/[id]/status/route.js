import { NextResponse } from "next/server";
const connectDB = require("../../../../../lib/db");
const Ticket = require("../../../../../models/Ticket");
const { getUserFromRequest } = require("../../../../../lib/auth");
const { emitToTicket, emitToAgents } = require("../../../../../lib/emitSocket");

const WORKFLOW = ["New", "Assigned", "In Progress", "Resolved"];

export async function PATCH(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (user.role !== "agent" && user.role !== "admin") {
    return NextResponse.json({ error: "Only agents can change ticket status." }, { status: 403 });
  }

  const { status, resolutionNote, reopen } = await request.json();

  await connectDB();
  const ticket = await Ticket.findById(params.id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });

  if (user.role === "agent" && ticket.assignedAgent && ticket.assignedAgent.toString() !== user.id) {
    return NextResponse.json({ error: "You can only update tickets assigned to you." }, { status: 403 });
  }

  // Business rule: a resolved ticket cannot change through the normal workflow unless reopened
  if (ticket.status === "Resolved" && !reopen) {
    return NextResponse.json(
      { error: "This ticket is resolved. Reopen it first to make further changes." },
      { status: 400 }
    );
  }

  if (reopen) {
    ticket.status = "In Progress";
    ticket.resolvedAt = null;
    await ticket.save();
    emitToTicket(ticket._id.toString(), "ticket:updated", { ticket });
    emitToAgents("ticket:updated", { ticketId: ticket._id.toString() });
    return NextResponse.json({ ticket });
  }

  if (!WORKFLOW.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  // Business rule: cannot mark Resolved without a resolution/reply note
  if (status === "Resolved" && !resolutionNote?.trim()) {
    return NextResponse.json(
      { error: "A resolution note is required to resolve a ticket." },
      { status: 400 }
    );
  }

  ticket.status = status;
  if (status === "Resolved") {
    ticket.resolutionNote = resolutionNote.trim();
    ticket.resolvedAt = new Date();
  }
  await ticket.save();

  emitToTicket(ticket._id.toString(), "ticket:updated", { ticket });
 emitToAgents("queue:updated", { ticketId: ticket._id.toString() });

  return NextResponse.json({ ticket });
}
