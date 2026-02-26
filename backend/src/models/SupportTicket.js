import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ["user", "admin"], required: true },
    text: { type: String, required: true },
    time: { type: Date, default: Date.now },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true },
    email: { type: String, required: true },

    subject: { type: String, required: true },
    description: { type: String, required: true },

    category: { type: String, enum: ["billing", "technical", "usage", "other"], default: "other" },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },

    status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },

    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("SupportTicket", supportTicketSchema);