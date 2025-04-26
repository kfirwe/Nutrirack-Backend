import MealHistory from "../models/MealHostory.model";

export const getMealHistories = async (userId: string) => {
    return MealHistory.find({ userId })
      .sort({ date: -1 })
      .populate("ingredients");
  };