import { parseNutritionDetails } from "../helpers/scan.helpers";
import MealHistory from "../models/MealHostory.model";
import { findOrCreateFood } from "./food.service";

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

  export const createMealHistory = async (userId: string, mealName: string, ingredients: any, nutritionDetails: any) => { 

    const newMealHistory = new MealHistory({
      userId,
      name: mealName,
      date: new Date(),
      ingredients,
      nutritionDetails: nutritionDetails,
    });
    await newMealHistory.save();
    return newMealHistory;
  }


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