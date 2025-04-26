import dotenv from "dotenv";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { callGeminiAPI } from "../api/gemini.api";
import Food, { IFood } from "../models/Food.model";
import { NutritionDetails } from "../types/nutrition.types";
import { OCRImage, TesseractResult } from "../types/scan.types";

dotenv.config();

export const resizeImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize({ width: 800 })
    .jpeg({ quality: 70 })
    .toBuffer();
};

export const getGeminiRecommendation = async (
  menuText: string,
  userNutritionalNeeds: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  },
  mealTime: string
) => {
  console.log("📡 Sending request to Gemini API...");

  const prompt = `
    You are an expert nutrition assistant. A user is selecting a meal from the following menu:
    "${menuText}"

    **Important:** The menu does not contain nutritional values. You must **estimate** approximate macronutrient values (calories, protein, carbs, and fat) based on common knowledge of typical food compositions.

    The user's remaining daily nutritional needs:
    - Calories: ${userNutritionalNeeds.calories} kcal
    - Protein: ${userNutritionalNeeds.protein}g
    - Carbs: ${userNutritionalNeeds.carbs}g
    - Fat: ${userNutritionalNeeds.fat}g

    It is currently ${mealTime}. Based on this information:
    - **Estimate** the macronutrient values for each menu item.
    - **Select the best meal** that **aligns with the user's daily nutrition goals**.
    - **Prioritize meals suitable for the time of day** (e.g., lighter for breakfast, balanced for lunch, high protein for post-workout, etc.).
    - If multiple meals are good options, provide the top 2-3 ranked choices.

    **Response Format Example:**
    - Recommended Meal: "Grilled Chicken Salad"
    - Estimated Nutrition: ~500 kcal, 40g protein, 35g carbs, 12g fat
    - Reasoning: High protein, balanced macros, fits the user's needs.
  `;

  const { success, message } = await callGeminiAPI(prompt);

  if (!success) {
    console.error("❌ Gemini API Error: Failed to get recommendation.");
    return "Could not generate a meal recommendation.";
  }

  console.log("✅ Gemini Response:", message);
  return message;
};

export const callOCR = async (image: OCRImage): Promise<string> => {
  try {
    console.log("🔍 Processing Image for OCR:", image.originalname);

    const {
      data: { text },
    }: TesseractResult = await Tesseract.recognize(image.buffer, "eng", {
      logger: (m: any) => console.log("Tesseract Log:", m),
    });

    console.log("📜 Extracted Menu Text:", text);
    return text;
  } catch (error) {
    console.error("❌ Tesseract OCR Error:", error);
    return "OCR failed to extract text";
  }
};

export const parseNutritionDetails = (details: string) => {
  const match = details.match(
    /(\d+(\.\d+)?) cals, (\d+(\.\d+)?)g protein, (\d+(\.\d+)?)g carbs, (\d+(\.\d+)?)g fat/
  );
  return match
    ? {
      cals: parseFloat(match[1]),
      protein: parseFloat(match[3]),
      carbs: parseFloat(match[5]),
      fat: parseFloat(match[7]),
    }
    : { cals: 0, protein: 0, carbs: 0, fat: 0 }; 
};




export const findOrCreateFood = async (
  name: string,
  nutritionDetails: NutritionDetails
): Promise<IFood> => {
  // Check if the food with the exact name and nutrition values already exists
  const existingFood = await Food.findOne({
    name,
    "nutritionDetails.cals": nutritionDetails.cals,
    "nutritionDetails.protein": nutritionDetails.protein,
    "nutritionDetails.carbs": nutritionDetails.carbs,
    "nutritionDetails.fat": nutritionDetails.fat,
  });

  if (existingFood) {
    return existingFood;
  }

  // Create a new food if it doesn't exist
  const newFood = new Food({
    name,
    nutritionDetails,
  });

  await newFood.save();
  return newFood;
};
