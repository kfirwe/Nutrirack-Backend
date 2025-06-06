import dotenv from "dotenv";
import sharp from "sharp";
import Tesseract from "tesseract.js";
import { callGeminiAPI } from "../api/gemini.api";
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
  console.log("Sending request to Gemini API...");

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
    - **Select the top 2-3 meals** that **best align with the user's daily nutrition goals**.
    - **Prioritize meals suitable for the time of day** (e.g., lighter for breakfast, balanced for lunch, high protein for post-workout, etc.).
    - Return the response in **JSON format** with the following structure:
    {
      "recommendations": [
        {
          "mealName": string,
          "estimatedNutrition": {
            "calories": number,
            "protein": number,
            "carbs": number,
            "fat": number
          },
          "reasoning": string
        }
      ]
    }
    Ensure the response is valid JSON without any markdown or code block markers (e.g., no \`\`\` or \`\`\`json).
  `;
  console.log(prompt);
  const { success, message } = await callGeminiAPI(prompt);

  if (!success) {
    console.error("Gemini API Error: Failed to get recommendation.");
    return { recommendations: [] };
  }
  console.log(message)
  console.log(message);

  // Clean up the response to remove markdown code block markers
  let cleanedMessage = message.trim();
  // Remove ```json or ``` at the start and end
  cleanedMessage = cleanedMessage.replace(/^```json\s*|\s*```$/g, "");
  // Remove any remaining backticks or whitespace
  cleanedMessage = cleanedMessage.replace(/^```|```$/g, "").trim();

  try {
    return JSON.parse(cleanedMessage);
  } catch (error) {
    console.error("Error parsing Gemini JSON response:", error);
    console.error("Cleaned Response:", cleanedMessage);
    return { recommendations: [] };
  }
};

export const callOCR = async (image: OCRImage): Promise<string> => {
  try {
    console.log("Processing Image for OCR:", image.originalname);

    const {
      data: { text },
    }: TesseractResult = await Tesseract.recognize(image.buffer, "eng", {
      logger: (m: any) => console.log("Tesseract Log:", m),
    });

    console.log("Extracted Menu Text:", text);
    return text;
  } catch (error) {
    console.error("Tesseract OCR Error:", error);
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