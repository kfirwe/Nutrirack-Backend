import axios from "axios";
import Food from "../models/Food.model";
import { callGeminiAPI } from "../api/gemini.api";

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