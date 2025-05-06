import { findOrCreateFood, parseNutritionDetails } from "../helpers/scan.helpers";
import MealHistory from "../models/MealHostory.model";

export const getMealHistories = async (userId: string) => {
    return MealHistory.find({ userId })
      .sort({ date: -1 })
      .populate("ingredients");
  };

  export const getRecentFoodsService = async (userId: string) => {
    const mealHistories = await getMealHistories(userId);
  
    if (!mealHistories.length) {
      return [];
    }
  
    const uniqueFoodsMap = new Map();
  
    for (const meal of mealHistories) {
      for (const food of meal.ingredients) {
        if (food.name !== "NOT_REAL_IGNORE" && !uniqueFoodsMap.has(food.name)) {
          uniqueFoodsMap.set(food.name, food);
          if (uniqueFoodsMap.size === 4) {
            break;
          }
        }
      }
      if (uniqueFoodsMap.size === 4) {
        break;
      }
    }
  
    return Array.from(uniqueFoodsMap.values());
  };


  export const addRecentFoodService = async (userId: string, foodName: string, details: any) => {
    const food = await findOrCreateFood(
      foodName,
      parseNutritionDetails(details)
    );
  
    const newMeal = new MealHistory({
      userId,
      name: `Meal with ${foodName}`,
      date: new Date(),
      ingredients: [food._id],
      nutritionDetails: food.nutritionDetails,
    });
  
    await newMeal.save();
  };

export const getMealsByDateService = async (userId: string, dateStr: string) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  return MealHistory.find({
    userId,
    date: {
      $gte: new Date(year, month, day, 0, 0, 0),
      $lt: new Date(year, month, day, 23, 59, 59),
    },
  })
    .sort({ createdAt: -1 })
    .populate("ingredients");
};