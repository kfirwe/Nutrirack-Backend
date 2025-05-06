import axios from "axios";
import FormData from "form-data";
import { resizeImage } from "../helpers/scan.helpers";
import {
    RecognitionResult,
    USDAFoodNutrient,
    USDANutrition,
} from "../types/nutrition.types";
import { uploadFoodImageToLogMeal } from "../api/logmeal.api";

const LOGMEAL_BARCODE_API_URL = "https://api.logmeal.com/v2/barcode_scan";
const LOGMEAL_API_KEY = process.env.LOGMEAL_API_KEY;
const USDA_API_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const USDA_API_KEY = process.env.USDA_API_KEY;

const prepareFormData = (
    image: Express.Multer.File,
    compressedBuffer: Buffer
) => {
    const formData = new FormData();
    formData.append("image", compressedBuffer, {
        filename: image.originalname || "food.jpg",
        contentType: image.mimetype || "image/jpeg",
    });
    return formData;
};

export const callLogmealAPI = async (imageFile: Express.Multer.File) => {
    try {
        if (!LOGMEAL_API_KEY) {
            throw new Error("LogMeal API Key is missing. Check your .env file.");
        }

        const compressedBuffer = await resizeImage(imageFile.buffer);
        const formData = prepareFormData(imageFile, compressedBuffer);

        const response = await await uploadFoodImageToLogMeal(formData);

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
                "LogMeal Barcode Error:",
                error.response?.data || error.message
            );
        } else {
            console.error("LogMeal Barcode Error:", error);
        }
        return {
            foodName,
            nutrition: { fat: null, carbs: null, cals: null, protein: null },
        };
    }
};

function extractNutrition(usdaFood: USDAFoodNutrient[]): USDANutrition {
    return {
        fat:
            usdaFood.find((n) => n.nutrientName.includes("Total lipid"))?.value ||
            null,
        carbs:
            usdaFood.find((n) => n.nutrientName.includes("Carbohydrate"))?.value ||
            null,
        cals:
            usdaFood.find((n) => n.nutrientName.includes("Energy"))?.value || null,
        protein:
            usdaFood.find((n) => n.nutrientName.includes("Protein"))?.value || null,
    };
}

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
        const usdaFoodName = response.data.foods?.[0]?.description || null;

        return {
            nutrition: extractNutrition(usdaFoodNutrients),
            name: usdaFoodName,
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error(
                "USDA Barcode Error:",
                error.response?.data || error.message
            );
        } else {
            console.error("USDA Barcode Error:", error);
        }
        return {
            nutrition: { fat: null, carbs: null, cals: null, protein: null },
            name: null,
        };
    }
};