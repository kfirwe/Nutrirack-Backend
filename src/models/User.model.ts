// The User that registers with the app will have a set of goals for their daily nutrition intake. These goals will be used to calculate the percentage of the daily goal that each meal contributes to. The User model will have the following fields:
import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  age: number;
  email: string;
  password: string;
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  height: number;
  weight: number;
  lastLogin: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: false },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    goals: {
      calories: { type: Number, required: false },
      protein: { type: Number, required: false },
      carbs: { type: Number, required: false },
      fat: { type: Number, required: false },
      type: { type: String, required: false },
    },
    height: { type: Number, required: false },
    weight: { type: Number, required: false },
    lastLogin: { type: Date, required: false },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
