import mongoose, { Schema, Document } from "mongoose";

export interface IMessage {
  chatId: mongoose.Types.ObjectId;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export interface IChat extends Document {
  userId: mongoose.Types.ObjectId;
  messages: IMessage[];
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  sender: { type: String, enum: ["user", "ai"], required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatSchema = new Schema<IChat>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IChat>("Chat", ChatSchema);
