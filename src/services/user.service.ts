import User from "../models/User.model";
import MealHistory from "../models/MealHostory.model";
import { Macros } from "../types/nutrition.types";

export const calculateTotalMacros = (meals: any[]): Macros => {
  return meals.reduce(
    (acc, meal) => {
      acc.calories += meal.nutritionDetails.cals || 0;
      acc.protein += meal.nutritionDetails.protein || 0;
      acc.carbs += meal.nutritionDetails.carbs || 0;
      acc.fat += meal.nutritionDetails.fat || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
};

export const getUserById = async (userId: string) => {
  return await User.findById(userId);
};

export const getUserMacrosToday = async (userId: string) => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const meals = await MealHistory.find({
    userId,
    date: { $gte: startOfDay, $lt: endOfDay },
  });

  return calculateTotalMacros(meals);
};

export const fetchUserMacrosGoals = async (userId: string) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
  
    const { goals } = user;
    if (!goals) throw new Error("Goals not set for user");
  
    return goals;
  };