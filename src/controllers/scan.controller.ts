import { Request, Response, NextFunction } from "express";
import {
  callLogmealAPI,
  callUSDADatasetAPI,
  callGeminiAPI,
  callOCR,
  callLogmealBarcodeAPI,
  parseNutritionDetails,
  estimateNutritionsValues,
  findOrCreateFood,
} from "../helpers/scan.helpers";
import Food from "../models/Food.model";
import MealHistory from "../models/MealHostory.model";
import axios from "axios";
import User from "../models/User.model";
import mongoose from "mongoose";

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
    console.error("Error in scanBarcode:", error);
    next(error);
  }
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

    console.log("Processing Menu Image...");

    const menuText = await callOCR(image);
    if (!menuText) {
      res.status(500).json({ error: "Failed to extract menu text." });
      return;
    }

    console.log("Extracted Menu Text:", menuText);

    const userId = (req.user as { id: string })?.id;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const meals = await MealHistory.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: today },
    }).populate("ingredients");

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

    const remainingCalories = Math.max(user.goals.calories - totalCalories, 0);
    const remainingProtein = Math.max(user.goals.protein - totalProtein, 0);
    const remainingCarbs = Math.max(user.goals.carbs - totalCarbs, 0);
    const remainingFat = Math.max(user.goals.fat - totalFat, 0);

    const currentHour = new Date().getHours();
    let mealTime = "Breakfast";
    if (currentHour >= 12 && currentHour < 17) mealTime = "Lunch";
    else if (currentHour >= 17) mealTime = "Dinner";

    console.log(`Meal Time: ${mealTime}`);

    const userNutritionalNeeds = {
      calories: remainingCalories || 0,
      protein: remainingProtein || 0,
      carbs: remainingCarbs || 0,
      fat: remainingFat || 0,
    };

    console.log("User's Remaining Nutritional Needs:", userNutritionalNeeds);

    const aiRecommendation = await callGeminiAPI(
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
    console.error("Error in scanMenuImage:", error);
    next(error);
  }
};

export const recentFoods = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const mealHistories = await MealHistory.find({ userId })
      .sort({ date: -1 })
      .populate("ingredients");

    if (!mealHistories.length) {
      res.status(200).json({ recentFoods: [] });
      return;
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

    const recentFoods = Array.from(uniqueFoodsMap.values());

    res.status(200).json({ recentFoods });
  } catch (error) {
    console.error("Error fetching recent foods:", error);
    res.status(500).json({ error: "Failed to fetch recent foods" });
  }
};

export const addRecentFood = async (req: Request, res: Response) => {
  try {
    console.log("Adding food to meal history...");
    const { userId, foodName, details } = req.body;

    if (!userId || !foodName || !details) {
      res.status(400).json({ success: false, message: "Missing data" });
      return;
    }

    console.log("Adding to meal history:", { userId, foodName, details });

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

    console.log("Food added successfully to history!");
    res.status(200).json({ success: true, message: "Food added!" });
    return;
  } catch (error) {
    console.error("Error adding food to history:", error);
    res.status(500).json({ success: false, message: "Server error" });
    return;
  }
};

export const estimateFood = async (req: Request, res: Response) => {
  try {
    const { foodName } = req.body;

    if (!foodName) {
      res
        .status(400)
        .json({ success: false, message: "Food name is required" });
      return;
    }

    console.log("Fetching estimated nutrition for:", foodName);

    const geminiMessage = await estimateNutritionsValues(foodName);

    console.log("Estimated Nutrition Response:", geminiMessage);

    res.status(200).json({ success: true, message: geminiMessage });
    return;
  } catch (error) {
    console.error("Error fetching estimated nutrition:", error);
    res.status(500).json({ success: false, message: "Server error" });
    return;
  }
};

export const addManualFood = async (req: Request, res: Response) => {
  try {
    const { name, nutritionDetails } = req.body;

    const newFood = await findOrCreateFood("NOT_REAL_IGNORE", nutritionDetails);

    await MealHistory.create({
      userId: (req.user as { id: string })?.id,
      name: "Custom Meal",
      date: new Date(),
      ingredients: [newFood._id],
      nutritionDetails,
    });

    res.json({ success: true, message: "Custom food added!" });
  } catch (error) {
    console.error("Custom Food Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to add custom food." });
  }
};

export const searchFoods = async (req: Request, res: Response) => {
  try {
    const searchQuery = req.params.query.trim();

    if (!searchQuery) {
      res.status(400).json({ error: "Query cannot be empty." });
      return;
    }

    console.log("Searching for:", searchQuery);

    let matchingFoods = await Food.find({
      name: { $regex: searchQuery, $options: "i", $ne: "NOT_REAL_IGNORE" }, // ignore "NOT_REAL_IGNORE" foods
    }).lean();

    console.log("Found:", matchingFoods.length, "foods before sorting");

    matchingFoods.sort((a, b) => {
      const indexA = a.name.toLowerCase().indexOf(searchQuery.toLowerCase());
      const indexB = b.name.toLowerCase().indexOf(searchQuery.toLowerCase());
      return indexA - indexB;
    });

    const uniqueFoods = [];
    const seenNames = new Set();

    for (const food of matchingFoods) {
      if (!seenNames.has(food.name)) {
        seenNames.add(food.name);
        uniqueFoods.push(food);
      }
      if (uniqueFoods.length >= 4) break;
    }

    console.log("Returning:", uniqueFoods.length, "unique foods");

    res.status(200).json({ foods: uniqueFoods });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Failed to search foods." });
  }
};

export const CheckGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    console.log(
      `Checking goals for user: ${userId} on ${year}-${month + 1}-${day}`
    );

    const mealsToday = await MealHistory.find({
      userId,
      date: {
        $gte: new Date(year, month, day, 0, 0, 0),
        $lt: new Date(year, month, day, 23, 59, 59),
      },
    }).populate("ingredients");

    console.log(`Found ${mealsToday.length} meals today.`);

    let totalCals = 0,
      totalProtein = 0,
      totalCarbs = 0,
      totalFat = 0;

    mealsToday.forEach((meal) => {
      meal.ingredients.forEach((food) => {
        totalCals += food.nutritionDetails.cals || 0;
        totalProtein += food.nutritionDetails.protein || 0;
        totalCarbs += food.nutritionDetails.carbs || 0;
        totalFat += food.nutritionDetails.fat || 0;
      });
    });

    console.log(
      `Total Today: Cals: ${totalCals}, Protein: ${totalProtein}, Carbs: ${totalCarbs}, Fat: ${totalFat}`
    );

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { calories, protein, carbs, fat } = user.goals || {};
    console.log(
      `User Goals: Cals: ${calories}, Protein: ${protein}, Carbs: ${carbs}, Fat: ${fat}`
    );

    const reachedGoals = [];

    if (totalCals >= calories) reachedGoals.push("Calories");
    if (totalProtein >= protein) reachedGoals.push("Protein");
    if (totalCarbs >= carbs) reachedGoals.push("Carbs");
    if (totalFat >= fat) reachedGoals.push("Fat");

    let message = "";
    if (reachedGoals.length === 0) {
      res.status(200).json({ message: "NO_GOALS_REACHED" }); // Frontend will ignore
      return;
    } else if (reachedGoals.length === 4) {
      message = "All nutrition goals reached! Great job! 🎯";
    } else {
      message = `You've reached your ${reachedGoals.join(
        ", "
      )} goal(s)! Keep going!`;
    }

    console.log("Goal Message:", message);
    res.status(200).json({ message });
  } catch (error) {
    console.error("Error checking goals:", error);
    res.status(500).json({ error: "Failed to check goals." });
  }
};
