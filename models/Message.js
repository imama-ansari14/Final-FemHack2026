const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["customer", "agent", "admin"], required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Message || mongoose.model("Message", MessageSchema);
