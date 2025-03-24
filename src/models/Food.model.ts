import mongoose, { Schema, Document } from "mongoose";

interface NutritionDetails {
  cals?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface IFood extends Document {
  name: string;
  nutritionDetails: NutritionDetails;
}

const FoodSchema: Schema = new Schema(
  {
    name: { type: String, required: true },

    nutritionDetails: {
      cals: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

// ✅ Custom validation: Ensure at least one nutrition field is provided
FoodSchema.pre<IFood>("validate", function (next) {
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

// ✅ Pre-save hook to set default values if any field is missing
FoodSchema.pre<IFood>("save", function (next) {
  this.nutritionDetails = {
    cals: this.nutritionDetails.cals ?? 0,
    protein: this.nutritionDetails.protein ?? 0,
    carbs: this.nutritionDetails.carbs ?? 0,
    fat: this.nutritionDetails.fat ?? 0,
  };
  next();
});

export default mongoose.model<IFood>("Food", FoodSchema);
