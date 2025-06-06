import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  age: number;
  email: string;
  password: string;
  gender: "male" | "female";
  height: number;
  weight: number;
  goalWeight: number;
  activityLevel: number;
  foodPreferences: "vegetarian" | "non-vegetarian" | "vegan";
  goals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  lastLogin: Date;
  profilePicture: string;
  pushToken?: string;
}

const UserSchema: Schema = new Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    age: { type: Number, required: false },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gender: { type: String, enum: ["male", "female"], required: false },
    height: { type: Number, required: false },
    weight: { type: Number, required: false },
    goalWeight: { type: Number, required: false },
    activityLevel: { type: Number, required: false },
    foodPreferences: {
      type: String,
      enum: ["vegetarian", "non-vegetarian", "vegan"],
      required: false,
    },
    goals: {
      calories: { type: Number, required: false },
      protein: { type: Number, required: false },
      carbs: { type: Number, required: false },
      fat: { type: Number, required: false },
      type: { type: String, required: false },
    },
    lastLogin: { type: Date, required: false },
    profilePicture: {
      type: String,
      required: false,
    },
    pushToken: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
