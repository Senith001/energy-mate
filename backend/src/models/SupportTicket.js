import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ["user", "admin"], default: "user" },
    text: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },

    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    category: {
      type: String,
      enum: ["billing", "usage", "appliance", "account", "other"],
      default: "other"
    },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    status: { type: String, enum: ["open", "in_progress", "closed"], default: "open" },

    messages: { type: [messageSchema], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model("SupportTicket", supportTicketSchema);