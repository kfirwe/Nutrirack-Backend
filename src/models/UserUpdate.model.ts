// When User update his goals it set it here
import mongoose, { Schema, Document } from "mongoose";

interface NutritionDetails {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  type: string;
}

export interface IUserUpdate extends Document {
  userId: string;
  email: string;
  goals: NutritionDetails;
  age: number;
  height: number;
  weight: number;
  date: Date;
}

const UserUpdateSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String, required: true, unique: true },
    goals: {
      calories: { type: Number, required: true },
      protein: { type: Number, required: true },
      carbs: { type: Number, required: true },
      fat: { type: Number, required: true },
      type: { type: String, required: false },
    },
    height: { type: Number, required: true },
    weight: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUserUpdate>("UserUpdate", UserUpdateSchema);
