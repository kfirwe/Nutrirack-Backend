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

//  Function to Resize Image (Compress Before Uploading)
const resizeImage = async (buffer: Buffer): Promise<Buffer> => {
  return await sharp(buffer)
    .resize({ width: 800 }) // Reduce width to 800px
    .jpeg({ quality: 70 }) // Reduce JPEG quality to 70%
    .toBuffer();
};

//  Function to Call LogMeal API
export const callLogmealAPI = async (imageFile: Express.Multer.File) => {
  try {
    if (!LOGMEAL_API_KEY) {
      throw new Error("LogMeal API Key is missing. Check your .env file.");
    }

    console.log("Using LogMeal API:", LOGMEAL_API_URL);
    console.log("Uploading Image:", imageFile.originalname);

    //  Resize and Compress the Image
    const compressedBuffer = await resizeImage(imageFile.buffer);
    console.log(
      "Original Size:",
      imageFile.buffer.length,
      "Compressed Size:",
      compressedBuffer.length
    );

    //  Create FormData for Image Upload
    const formData = new FormData();
    formData.append("image", compressedBuffer, {
      filename: imageFile.originalname || "food.jpg",
      contentType: imageFile.mimetype || "image/jpeg",
    });

    //  Step 1: Send Image to LogMeal API
    const response = await axios.post(LOGMEAL_API_URL, formData, {
      headers: {
        Authorization: `Bearer ${LOGMEAL_API_KEY}`,
        ...formData.getHeaders(), // Automatically sets multipart headers
      },
    });

    console.log("LogMeal Response:", response.data);

    //  Step 2: Extract Recognized Food from `segmentation_results`
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

    //  Step 3: Find Most Probable Food
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

    // if (mostProbableFood.prob < 50) {
    //   return { message: "Food not recognized with high confidence." };
    // }

    const foodName = mostProbableFood.name;
    console.log("Recognized Food:", foodName);

    //  Step 4: Fetch Nutrition Information from LogMeal
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

    //  Step 5: Fetch Missing Nutrition Data from USDA
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

      //  Take the Average if Both Sources Have Values
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

    //  Return Final Data
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

    console.log("📡 Fetching from LogMeal for barcode:", barcode);

    console.log(`${LOGMEAL_BARCODE_API_URL}/${barcode}`);

    const response = await axios.post(
      `${LOGMEAL_BARCODE_API_URL}/${barcode}`,
      null, // <-- Ensures Axios correctly processes headers
      {
        headers: { Authorization: `Bearer ${LOGMEAL_API_KEY}` },
      }
    );

    console.log("📌 LogMeal Response:", response.data);

    if (!response.data.product_name) {
      throw new Error("Product not found in LogMeal database.");
    }

    foodName = response.data.product_name;
    const dishId = response.data.dish_id;

    // ✅ Step 2: Fetch Nutrition Data using Dish ID
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

// ✅ Function to get nutrition info from USDA API using barcode
export const callUSDADatasetAPI = async (barcode: string) => {
  try {
    if (!USDA_API_KEY) {
      throw new Error("USDA API Key is missing. Check your .env file.");
    }

    console.log("📡 Fetching from USDA for barcode:", barcode);

    // ✅ Step 1: Fetch from USDA API
    const response = await axios.get(
      `${USDA_API_URL}?query=${barcode}&api_key=${USDA_API_KEY}`
    );

    console.log("📌 USDA Response:", response.data);

    // ✅ Step 2: Extract Nutrition Data
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
// export const callGeminiAPI = async (
//   menuText: string,
//   userNutritionalNeeds: UserNutritionalNeeds,
//   mealTime: string
// ) => {
//   try {
//     const prompt = `
//       You are a nutrition assistant. Based on the following menu options:
//       "${menuText}"

//       And the user's remaining daily nutritional needs:
//       Calories: ${userNutritionalNeeds.calories} kcal
//       Protein: ${userNutritionalNeeds.protein}g
//       Carbs: ${userNutritionalNeeds.carbs}g
//       Fat: ${userNutritionalNeeds.fat}g

//       It is currently ${mealTime}. Suggest the best meal for the user considering the nutritional goals.
//     `;

//     const response = await axios.post(
//       "https://gemini-api.example.com/generate", // Replace with your Gemini API endpoint
//       { prompt },
//       { headers: { Authorization: `Bearer ${process.env.GEMINI_API_KEY}` } }
//     );

//     return response.data.message;
//   } catch (error) {
//     if (error instanceof Error) {
//       console.error("❌ Gemini API Error:", error.message);
//     } else {
//       console.error("❌ Gemini API Error:", error);
//     }
//     return "Could not generate meal recommendation.";
//   }
// };

// Extract Text from Menu Image using OCR
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
// export const callOCR = async (image: OCRImage): Promise<string | null> => {
//   try {
//     const { data }: { data: OCRResult } = await Tesseract.recognize(
//       image.path,
//       "eng"
//     );
//     return data.text.trim();
//   } catch (error) {
//     console.error("❌ OCR Error:", (error as Error).message);
//     return null;
//   }
// };

// 🔹 Helper function to parse nutrition details from text
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
      params: { key: process.env.GEMINI_API_KEY }, // Ensure API Key is set in .env
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
