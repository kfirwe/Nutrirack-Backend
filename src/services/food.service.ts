import axios from "axios";
import Food, { IFood } from "../models/Food.model";
import { callGeminiAPI } from "../api/gemini.api";
import { NutritionDetails } from "../types/nutrition.types";

export const findMatchingFoods = async (searchQuery: string) => {
    const foods = await Food.find({
        name: { $regex: searchQuery, $options: "i", $ne: "NOT_REAL_IGNORE" },
    }).lean();

    return foods;
};

export const sortFoodsByRelevance = (foods: any[], searchQuery: string) => {
    return foods.sort((a, b) => {
        const indexA = a.name.toLowerCase().indexOf(searchQuery.toLowerCase());
        const indexB = b.name.toLowerCase().indexOf(searchQuery.toLowerCase());
        return indexA - indexB;
    });
};

export const getUniqueTopFoods = (foods: any[], limit = 4) => {
    const uniqueFoods = [];
    const seenNames = new Set();

    for (const food of foods) {
        if (!seenNames.has(food.name)) {
            seenNames.add(food.name);
            uniqueFoods.push(food);
        }
        if (uniqueFoods.length >= limit) break;
    }

    return uniqueFoods;
};


export async function estimateNutritionsValues(foodName: any) {
    const prompt = `
      You are a nutrition expert. Estimate the approximate nutrition values for the food item:
      **"${foodName}"**
  
      Provide the approximate values for:
      - Calories (kcal)
      - Protein (grams)
      - Carbs (grams)
      - Fat (grams)
  
      Your response format should be:
      **Calories:** XX kcal
      **Protein:** XXg
      **Carbs:** XXg
      **Fat:** XXg
    `;

    const { success, message } = await callGeminiAPI(prompt);

    if (!success) {
        throw new Error("Failed to estimate nutrition values");
    }

    return message;
}


export const createNewFood = async (
  name: string,
  nutritionDetails: NutritionDetails
): Promise<IFood> => {
  const newFood = new Food({ name, nutritionDetails });
  await newFood.save();
  return newFood;
};


const findFoodByNameAndNutrition = async (
    name: string,
    nutritionDetails: NutritionDetails
  ): Promise<IFood | null> => {
    return await Food.findOne({
      name,
      "nutritionDetails.cals": nutritionDetails.cals,
      "nutritionDetails.protein": nutritionDetails.protein,
      "nutritionDetails.carbs": nutritionDetails.carbs,
      "nutritionDetails.fat": nutritionDetails.fat,
    });
  };
  
  
  
  export const findOrCreateFood = async (
    name: string,
    nutritionDetails: NutritionDetails
  ): Promise<IFood> => {
  
    const existingFood = await findFoodByNameAndNutrition(name, nutritionDetails);
  
    if (existingFood) {
      return existingFood;
    }
  
    return await createNewFood(name, nutritionDetails);
  };