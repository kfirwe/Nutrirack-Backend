import mongoose, { Schema, Document } from "mongoose";

export interface IReminder extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  mealType: string;
  reminderTime: Date;
  notificationMessage: string;
  notificationSent: boolean;
}

const reminderSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
    },
    reminderTime: { type: Date, required: true },
    notificationMessage: { type: String, required: true },
    notificationSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IReminder>("Reminder", reminderSchema);
