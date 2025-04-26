import axios from "axios";
import Tesseract from "tesseract.js";
import dotenv from "dotenv";
import FormData from "form-data";
import sharp from "sharp";
import { IFood } from "../models/Food.model";
import Food from "../models/Food.model";
import { OCRImage, TesseractResult } from "../types/scan.types";
import { NutritionDetails } from "../types/nutrition.types";

dotenv.config();

export const resizeImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize({ width: 800 }) 
    .jpeg({ quality: 70 }) 
    .toBuffer();
};

export const callGeminiAPI = async (
  menuText: string,
  userNutritionalNeeds: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  },
  mealTime: string
) => {
  try {
    console.log("📡 Sending request to Gemini API...");

    // 🔥 Define the prompt dynamically based on menu & user needs
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

    // 🔥 Send request to Gemini API
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        params: { key: process.env.GEMINI_API_KEY }, // Ensure API Key is set in .env
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("✅ Gemini Response:", response.data);

    // Extract and return the response
    return (
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No recommendation available."
    );
  } catch (error) {
    console.error(
      "❌ Gemini API Error:",
      (error as axios.AxiosError)?.response?.data || (error as Error).message
    );
    return "Could not generate a meal recommendation.";
  }
};


export const callOCR = async (image: OCRImage): Promise<string> => {
  try {
    console.log("🔍 Processing Image for OCR:", image.originalname);

    // ✅ Convert Buffer to a Valid Image Format
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
    : { cals: 0, protein: 0, carbs: 0, fat: 0 }; // Default if parsing fails
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

  // 🔥 Send request to Gemini API
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
    },
    {
      params: { key: process.env.GEMINI_API_KEY }, 
      headers: { "Content-Type": "application/json" },
    }
  );

  const geminiMessage =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No data available";
  return geminiMessage;
}



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
