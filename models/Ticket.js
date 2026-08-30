const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Human-set / human-confirmed fields (may start as AI suggestions, then get edited)
    category: {
      type: String,
      enum: ["Billing", "Technical", "Account", "Shipping", "General"],
      default: "General",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    summary: { type: String, default: "" },

    status: {
      type: String,
      enum: ["New", "Assigned", "In Progress", "Resolved"],
      default: "New",
    },

    // Raw AI suggestion, kept for audit/comparison even after a human edits it.
    aiSuggestion: {
      category: String,
      priority: String,
      summary: String,
      aiAvailable: Boolean,
      reviewedByAgent: { type: Boolean, default: false },
    },

    resolutionNote: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
