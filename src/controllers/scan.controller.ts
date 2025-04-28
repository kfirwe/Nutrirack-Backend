import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import {
  getGeminiRecommendation,
  callOCR,
  findOrCreateFood,
} from "../helpers/scan.helpers";
import MealHistory from "../models/MealHostory.model";
import User from "../models/User.model";
import {
  callLogmealAPI,
  callLogmealBarcodeAPI,
  callUSDADatasetAPI,
} from "../services/scan.service";
import { getUserById } from "../services/user.service";

export const scanFoodImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const image = req.file;
    if (!image) {
      res.status(400).json({ error: "No image provided" });
      return;
    }

    if (!image || !image.buffer) {
      throw new Error("Image file is missing or invalid.");
    }

    const nutritionData = await callLogmealAPI(image);

    if ("error" in nutritionData) {
      res.status(500).json({ error: nutritionData["error"] });
      return;
    }

    if (!nutritionData.nutrition) {
      res.status(500).json({ error: "Nutrition data is missing or invalid." });
      return;
    }

    const newFood = await findOrCreateFood(
      nutritionData.foodName,
      nutritionData.nutrition
    );

    const newMealHistory = new MealHistory({
      userId: (req.user as { id: string })?.id,
      name: nutritionData.foodName,
      date: new Date(),
      ingredients: [newFood._id],
      nutritionDetails: nutritionData.nutrition,
    });
    await newMealHistory.save();

    res.status(200).json(nutritionData);
  } catch (error) {
    next(error);
  }
};

export const scanBarcode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { barcode } = req.body;
    if (!barcode) {
      res.status(400).json({ error: "No barcode provided" });
      return;
    }

    console.log("Scanning Barcode:", barcode);

    const logMealNutrition: { [key: string]: any } =
      await callLogmealBarcodeAPI(barcode);
    console.log("LogMeal Nutrition:", logMealNutrition);

    if (Object.values(logMealNutrition.nutrition).includes(null)) {
      console.log("Fetching missing values from USDA...");
      const usdaNutrition: { [key: string]: any } = await callUSDADatasetAPI(
        barcode
      );
      console.log("USDA Nutrition:", usdaNutrition);
      console.log("LogMeal Nutrition:", logMealNutrition);

      for (const key in logMealNutrition.nutrition) {
        if (key && key in usdaNutrition) {
          if (
            logMealNutrition.nutrition[key] !== null &&
            usdaNutrition[key] !== null
          ) {
            logMealNutrition.nutrition[key] =
              (logMealNutrition.nutrition[key] + usdaNutrition[key]) / 2;
          } else if (usdaNutrition[key] !== null) {
            logMealNutrition.nutrition[key] = usdaNutrition[key];
          }
        }
      }
    }

    console.log("Final Nutrition:", logMealNutrition);

    const newFood = await findOrCreateFood(
      logMealNutrition.foodName,
      logMealNutrition.nutrition
    );

    const newMealHistory = new MealHistory({
      userId: (req.user as { id: string })?.id,
      name: logMealNutrition.foodName,
      date: new Date(),
      ingredients: [newFood._id],
      nutritionDetails: logMealNutrition.nutrition,
    });
    await newMealHistory.save();

    res.status(200).json({ barcode, ...logMealNutrition });
  } catch (error) {
    console.error("❌ Error in scanBarcode:", error);
    next(error);
  }
};

const extractMenuText = async (image: Express.Multer.File) => {
  console.log("Processing Menu Image...");
  const menuText = await callOCR(image);
  if (!menuText) {
    throw new Error("Failed to extract menu text.");
  }
  console.log("Extracted Menu Text:", menuText);
  return menuText;
};

const getTodayMeals = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const meals = await MealHistory.find({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: today },
  }).populate("ingredients");

  return meals;
};

const calculateRemainingGoals = (user: any, meals: any[]) => {
  let totalCalories = 0,
    totalProtein = 0,
    totalCarbs = 0,
    totalFat = 0;

  meals.forEach((meal) => {
    totalCalories += meal.nutritionDetails.cals || 0;
    totalProtein += meal.nutritionDetails.protein || 0;
    totalCarbs += meal.nutritionDetails.carbs || 0;
    totalFat += meal.nutritionDetails.fat || 0;
  });

  return {
    calories: Math.max(user.goals.calories - totalCalories, 0),
    protein: Math.max(user.goals.protein - totalProtein, 0),
    carbs: Math.max(user.goals.carbs - totalCarbs, 0),
    fat: Math.max(user.goals.fat - totalFat, 0),
  };
};

const getMealTime = () => {
  const currentHour = new Date().getHours();
  if (currentHour >= 12 && currentHour < 17) return "Lunch";
  if (currentHour >= 17) return "Dinner";
  return "Breakfast";
};

export const scanMenuImage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const image = req.file;
    if (!image) {
      res.status(400).json({ error: "No menu image provided" });
      return;
    }

    const menuText = await extractMenuText(image);
    const userId = (req.user as { id: string })?.id;
    const user = await getUserById(userId);

    const meals = await getTodayMeals(user.id);

    const userNutritionalNeeds = calculateRemainingGoals(user, meals);
    const mealTime = getMealTime();

    console.log("User's Remaining Nutritional Needs:", userNutritionalNeeds);

    const aiRecommendation = await getGeminiRecommendation(
      menuText,
      userNutritionalNeeds,
      mealTime
    );

    console.log("AI Recommended Meal:", aiRecommendation);

    res.status(200).json({
      menuText,
      recommendedDish: aiRecommendation,
      userNutritionalNeeds,
    });
  } catch (error) {
    console.error("❌ Error in scanMenuImage:", error);
    next(error);
  }
};
