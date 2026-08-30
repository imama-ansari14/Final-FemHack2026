import { NextResponse } from "next/server";
const Notification = require("../../../../../models/Notification");

const connectDB = require("../../../../../lib/db");
const Ticket = require("../../../../../models/Ticket");
const { getUserFromRequest } = require("../../../../../lib/auth");
const {
  emitToTicket,
  emitToAgents,
} = require("../../../../../lib/emitSocket");

const WORKFLOW = [
  "Assigned",
  "In Progress",
  "Resolved",
];

await ticket.save();
if (status === "Resolved") {
  await Notification.create({
    user: ticket.customer,
    ticket: ticket._id,
    type: "ticket_completed",
    title: "Complaint completed",
    message: `Your ticket ${ticket.ticketNumber} has been completed. Tap to review the service.`,
  });
}

export async function PATCH(request, { params }) {
  const user = getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (user.role !== "agent" && user.role !== "admin") {
    return NextResponse.json(
      {
        error: "Only workers can change ticket status.",
      },
      { status: 403 }
    );
  }

  try {
    const {
      status,
      resolutionNote,
    } = await request.json();

    await connectDB();

    const ticket = await Ticket.findById(params.id);

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found." },
        { status: 404 }
      );
    }

    // FINAL STATUS CHECK
    if (ticket.status === "Resolved") {
      return NextResponse.json(
        {
          error: "This ticket is already completed and cannot be changed.",
        },
        { status: 400 }
      );
    }

    // Only after this point can the status be changed
    ticket.status = status;

    // Worker can only update their own tickets.
    if (
      user.role === "agent" &&
      (!ticket.assignedAgent ||
        ticket.assignedAgent.toString() !== user.id)
    ) {
      return NextResponse.json(
        {
          error:
            "You can only update tickets assigned to you.",
        },
        { status: 403 }
      );
    }

    // COMPLETED/RESOLVED IS PERMANENT.
    if (ticket.status === "Resolved") {
      return NextResponse.json(
        {
          error: "This ticket is already completed and cannot be changed.",
        },
        { status: 400 }
      );
    }

    if (!WORKFLOW.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status." },
        { status: 400 }
      );
    }

    // Enforce sequential workflow.
    if (
      ticket.status === "Assigned" &&
      status !== "In Progress" &&
      status !== "Resolved"
    ) {
      return NextResponse.json(
        {
          error:
            "An assigned ticket must move to In Progress first.",
        },
        { status: 400 }
      );
    }

    if (
      ticket.status === "In Progress" &&
      status === "Assigned"
    ) {
      return NextResponse.json(
        {
          error:
            "An In Progress ticket cannot go back to Assigned.",
        },
        { status: 400 }
      );
    }

    // Resolution note is mandatory.
    if (status === "Resolved" && !resolutionNote?.trim()) {
      return NextResponse.json(
        {
          error:
            "A resolution note is required to complete the ticket.",
        },
        { status: 400 }
      );
    }

    ticket.status = status;

    if (status === "Resolved") {
      ticket.resolutionNote = resolutionNote.trim();
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    // Update everyone viewing this ticket.
    emitToTicket(
      ticket._id.toString(),
      "ticket:updated",
      { ticket }
    );

    // Refresh worker dashboard.
    emitToAgents(
      "queue:updated",
      {
        ticketId: ticket._id.toString(),
      }
    );

    return NextResponse.json({ ticket });
  } catch (err) {
    console.error("Status update error:", err);

    return NextResponse.json(
      {
        error:
          "Could not update ticket status.",
      },
      { status: 500 }
    );
  }
}
