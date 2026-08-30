import { NextResponse } from "next/server";
const connectDB = require("../../../../../lib/db");
const Ticket = require("../../../../../models/Ticket");
const Message = require("../../../../../models/Message");
const { getUserFromRequest } = require("../../../../../lib/auth");
const { emitToTicket } = require("../../../../../lib/emitSocket");

export async function POST(request, { params }) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { body } = await request.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }

  await connectDB();
  const ticket = await Ticket.findById(params.id);
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });

  const isOwner = ticket.customer.toString() === user.id;
  const isAssignedAgent = ticket.assignedAgent && ticket.assignedAgent.toString() === user.id;
  const isAgentUnassigned = user.role === "agent" && !ticket.assignedAgent;
  if (user.role === "customer" && !isOwner) {
    return NextResponse.json({ error: "You do not have access to this ticket." }, { status: 403 });
  }
  if (user.role === "agent" && !isAssignedAgent && !isAgentUnassigned) {
    return NextResponse.json({ error: "This ticket is assigned to another agent." }, { status: 403 });
  }

  if (ticket.status === "Resolved") {
    return NextResponse.json(
      { error: "This ticket is resolved. Reopen it to keep messaging." },
      { status: 400 }
    );
  }

  const message = await Message.create({
    ticket: ticket._id,
    sender: user.id,
    senderRole: user.role,
    body: body.trim(),
  });

  // If an agent replies to a New ticket, move it into progress automatically.
  if (user.role === "agent" && ticket.status === "Assigned") {
    ticket.status = "In Progress";
    await ticket.save();
  }

  const populated = await message.populate("sender", "name role");

  emitToTicket(ticket._id.toString(), "message:new", { message: populated, ticket });

  return NextResponse.json({ message: populated, ticket }, { status: 201 });
}
