import axios from "axios";
import Tesseract from "tesseract.js";
import dotenv from "dotenv";
import FormData from "form-data";
import sharp from "sharp";
import { IFood } from "../models/Food.model";
import Food from "../models/Food.model";

dotenv.config();

const LOGMEAL_API_URL =
  "https://api.logmeal.com/v2/image/segmentation/complete/v1.0";
const LOGMEAL_BARCODE_API_URL = "https://api.logmeal.com/v2/barcode_scan";
const LOGMEAL_API_KEY = process.env.LOGMEAL_API_KEY;
const USDA_API_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const USDA_API_KEY = process.env.USDA_API_KEY;

interface UserNutritionalNeeds {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const resizeImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize({ width: 800 })
    .jpeg({ quality: 70 })
    .toBuffer();
};

export const callLogmealAPI = async (imageFile: Express.Multer.File) => {
  try {
    if (!LOGMEAL_API_KEY) {
      throw new Error("LogMeal API Key is missing. Check your .env file.");
    }

    console.log("Using LogMeal API:", LOGMEAL_API_URL);
    console.log("Uploading Image:", imageFile.originalname);

    const compressedBuffer = await resizeImage(imageFile.buffer);
    console.log(
      "Original Size:",
      imageFile.buffer.length,
      "Compressed Size:",
      compressedBuffer.length
    );

    const formData = new FormData();
    formData.append("image", compressedBuffer, {
      filename: imageFile.originalname || "food.jpg",
      contentType: imageFile.mimetype || "image/jpeg",
    });

    const response = await axios.post(LOGMEAL_API_URL, formData, {
      headers: {
        Authorization: `Bearer ${LOGMEAL_API_KEY}`,
        ...formData.getHeaders(),
      },
    });

    console.log("LogMeal Response:", response.data);

    if (
      !response.data.segmentation_results ||
      response.data.segmentation_results.length === 0
    ) {
      return { message: "No recognizable food items found." };
    }

    const segmentationResults = response.data.segmentation_results;
    const recognitionResults = segmentationResults.flatMap(
      (item: any) => item.recognition_results
    );

    if (recognitionResults.length === 0) {
      return { message: "Food not recognized in image." };
    }

    interface RecognitionResult {
      name: string;
      prob: number;
    }

    interface SegmentationResult {
      recognition_results: RecognitionResult[];
    }

    const mostProbableFood = recognitionResults.reduce(
      (prev: RecognitionResult, curr: RecognitionResult) =>
        curr.prob > prev.prob ? curr : prev
    );

    const foodName = mostProbableFood.name;
    console.log("Recognized Food:", foodName);

    const nutritionResponse = await axios.post(
      "https://api.logmeal.com/v2/nutrition/recipe/nutritionalInfo",
      { imageId: response.data.imageId },
      { headers: { Authorization: `Bearer ${LOGMEAL_API_KEY}` } }
    );

    const logMealNutrients =
      nutritionResponse.data.nutritional_info.totalNutrients;
    let nutrition = {
      fat: logMealNutrients?.FAT?.quantity
        ? parseFloat(logMealNutrients.FAT.quantity.toFixed(2))
        : null,
      carbs: logMealNutrients?.CHOCDF?.quantity
        ? parseFloat(logMealNutrients.CHOCDF.quantity.toFixed(2))
        : null,
      cals: logMealNutrients?.ENERC_KCAL?.quantity
        ? parseFloat(logMealNutrients.ENERC_KCAL.quantity.toFixed(2))
        : null,
      protein: logMealNutrients?.PROCNT?.quantity
        ? parseFloat(logMealNutrients.PROCNT.quantity.toFixed(2))
        : null,
    };

    if (Object.values(nutrition).includes(null)) {
      const usdaResponse = await axios.get(
        `${USDA_API_URL}?query=${encodeURIComponent(
          foodName
        )}&api_key=${USDA_API_KEY}`
      );
      const usdaFood = usdaResponse.data.foods?.[0]?.foodNutrients || [];

      interface USDAFoodNutrient {
        nutrientName: string;
        value: number;
      }

      interface USDANutrition {
        fat: number | null;
        carbs: number | null;
        cals: number | null;
        protein: number | null;
      }

      interface USDAFoodNutrient {
        nutrientName: string;
        value: number;
      }

      const usdaNutrition: USDANutrition = {
        fat:
          usdaFood.find((n: USDAFoodNutrient) =>
            n.nutrientName.includes("Total lipid")
          )?.value || null,
        carbs:
          usdaFood.find((n: USDAFoodNutrient) =>
            n.nutrientName.includes("Carbohydrate")
          )?.value || null,
        cals:
          usdaFood.find((n: USDAFoodNutrient) =>
            n.nutrientName.includes("Energy")
          )?.value || null,
        protein:
          usdaFood.find((n: USDAFoodNutrient) =>
            n.nutrientName.includes("Protein")
          )?.value || null,
      };

      for (const key of Object.keys(nutrition) as Array<keyof USDANutrition>) {
        if (nutrition[key] !== null && usdaNutrition[key] !== null) {
          nutrition[key] = parseFloat(
            ((nutrition[key]! + usdaNutrition[key]!) / 2).toFixed(2)
          );
        } else if (usdaNutrition[key] !== null) {
          nutrition[key] = parseFloat(usdaNutrition[key]!.toFixed(2));
        }
      }
    }

    return { foodName, nutrition };
  } catch (error) {
    console.error(
      "Error in scanFoodImage:",
      (error as any).response?.data || error
    );
    return { error: "Failed to process image" };
  }
};

export const callLogmealBarcodeAPI = async (barcode: string) => {
  let foodName = null;
  try {
    if (!LOGMEAL_API_KEY) {
      throw new Error("LogMeal API Key is missing. Check your .env file.");
    }

    console.log("Fetching from LogMeal for barcode:", barcode);

    console.log(`${LOGMEAL_BARCODE_API_URL}/${barcode}`);

    const response = await axios.post(
      `${LOGMEAL_BARCODE_API_URL}/${barcode}`,
      null,
      {
        headers: { Authorization: `Bearer ${LOGMEAL_API_KEY}` },
      }
    );

    console.log("LogMeal Response:", response.data);

    if (!response.data.product_name) {
      throw new Error("Product not found in LogMeal database.");
    }

    foodName = response.data.product_name;
    const dishId = response.data.dish_id;

    const nutritionResponse = await axios.post(
      "https://api.logmeal.com/v2/nutrition/recipe/nutritionalInfo/v1.0/",
      { dish_id: dishId },
      { headers: { Authorization: `Bearer ${LOGMEAL_API_KEY}` } }
    );

    console.log(nutritionResponse.data);

    const logMealNutrients =
      nutritionResponse.data.nutritional_info?.totalNutrients || {};

    return {
      foodName,
      nutrition: {
        fat: logMealNutrients?.FAT?.quantity || null,
        carbs: logMealNutrients?.CHOCDF?.quantity || null,
        cals: logMealNutrients?.ENERC_KCAL?.quantity || null,
        protein: logMealNutrients?.PROCNT?.quantity || null,
      },
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "❌ LogMeal Barcode Error:",
        error.response?.data || error.message
      );
    } else {
      console.error("❌ LogMeal Barcode Error:", error);
    }
    return {
      foodName,
      nutrition: { fat: null, carbs: null, cals: null, protein: null },
    };
  }
};

export const callUSDADatasetAPI = async (barcode: string) => {
  try {
    if (!USDA_API_KEY) {
      throw new Error("USDA API Key is missing. Check your .env file.");
    }

    console.log("Fetching from USDA for barcode:", barcode);

    const response = await axios.get(
      `${USDA_API_URL}?query=${barcode}&api_key=${USDA_API_KEY}`
    );

    console.log("USDA Response:", response.data);

    const usdaFoodNutrients = response.data.foods?.[0]?.foodNutrients || [];

    interface USDAFoodNutrient {
      nutrientName: string;
      value: number;
    }

    interface USDANutrition {
      fat: number | null;
      carbs: number | null;
      cals: number | null;
      protein: number | null;
    }

    const usdaFood: USDAFoodNutrient[] =
      response.data.foods?.[0]?.foodNutrients || [];

    const nutrition: USDANutrition = {
      fat:
        usdaFood.find((n: USDAFoodNutrient) =>
          n.nutrientName.includes("Total lipid")
        )?.value || null,
      carbs:
        usdaFood.find((n: USDAFoodNutrient) =>
          n.nutrientName.includes("Carbohydrate")
        )?.value || null,
      cals:
        usdaFood.find((n: USDAFoodNutrient) =>
          n.nutrientName.includes("Energy")
        )?.value || null,
      protein:
        usdaFood.find((n: USDAFoodNutrient) =>
          n.nutrientName.includes("Protein")
        )?.value || null,
    };

    return nutrition;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "❌ USDA Barcode Error:",
        error.response?.data || error.message
      );
    } else {
      console.error("❌ USDA Barcode Error:", error);
    }
    return { fat: null, carbs: null, cals: null, protein: null };
  }
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
      - **Select the best meal** that **aligns with the user's daily nutrition goals**.
      - **Prioritize meals suitable for the time of day** (e.g., lighter for breakfast, balanced for lunch, high protein for post-workout, etc.).
      - If multiple meals are good options, provide the top 2-3 ranked choices.

      **Response Format Example:**
      - Recommended Meal: "Grilled Chicken Salad"
      - Estimated Nutrition: ~500 kcal, 40g protein, 35g carbs, 12g fat
      - Reasoning: High protein, balanced macros, fits the user's needs.
    `;

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

    console.log("Gemini Response:", response.data);

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

interface OCRResult {
  text: string;
}

interface OCRImage {
  path: string;
}

interface OCRImage {
  buffer: Buffer;
  originalname: string;
}

interface TesseractResult {
  data: {
    text: string;
  };
}

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

interface NutritionDetails {
  cals?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export const findOrCreateFood = async (
  name: string,
  nutritionDetails: NutritionDetails
): Promise<IFood> => {
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

  const newFood = new Food({
    name,
    nutritionDetails,
  });

  await newFood.save();
  return newFood;
};
