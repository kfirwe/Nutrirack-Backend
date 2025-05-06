import mongoose, { Schema, Document } from "mongoose";
import { IFood } from "./Food.model";

interface NutritionDetails {
  cals?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface IMealHistory extends Document {
  userId: string;
  name: string;
  date: Date;
  ingredients: IFood[];
  nutritionDetails: NutritionDetails;
  createdAt: Date;
}

const MealHistorySchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    ingredients: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Food", required: true },
    ],
    nutritionDetails: {
      cals: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

MealHistorySchema.pre<IMealHistory>("validate", function (next) {
  const { cals, protein, carbs, fat } = this.nutritionDetails || {};
  if (!cals && !protein && !carbs && !fat) {
    return next(
      new Error(
        "At least one nutrition detail (cals, protein, carbs, or fat) must be provided."
      )
    );
  }
  next();
});

MealHistorySchema.pre<IMealHistory>("save", function (next) {
  this.nutritionDetails = {
    cals: this.nutritionDetails.cals ?? 0,
    protein: this.nutritionDetails.protein ?? 0,
    carbs: this.nutritionDetails.carbs ?? 0,
    fat: this.nutritionDetails.fat ?? 0,
  };
  next();
});

export default mongoose.model<IMealHistory>("MealHistory", MealHistorySchema);
