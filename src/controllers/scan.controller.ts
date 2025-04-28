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
    console.error("Error in scanBarcode:", error);
    next(error);
  }
};

const extractMenuText = async (image: Express.Multer.File) => {
  console.log("📸 Processing Menu Image...");
  const menuText = await callOCR(image);
  if (!menuText) {
    throw new Error("Failed to extract menu text.");
  }
  console.log("📄 Extracted Menu Text:", menuText);
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

    // 🔹 Fetch meal history sorted by date (most recent first)
    const mealHistories = await MealHistory.find({ userId })
      .sort({ date: -1 })
      .populate("ingredients"); // Get full food details

    if (!mealHistories.length) {
      res.status(200).json({ recentFoods: [] });
      return;
    }

    // 🔹 Extract unique foods
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

    // 🔹 Convert map to an array & limit results
    const recentFoods = Array.from(uniqueFoodsMap.values());

    res.status(200).json({ recentFoods });
  } catch (error) {
    console.error("Error fetching recent foods:", error);
    res.status(500).json({ error: "Failed to fetch recent foods" });
  }
};

// ✅ Add Food to Meal History
export const addRecentFood = async (req: Request, res: Response) => {
  try {
    console.log("📌 Adding food to meal history...");
    const { userId, foodName, details } = req.body;

    if (!userId || !foodName || !details) {
      res.status(400).json({ success: false, message: "Missing data" });
      return;
    }

    console.log("📌 Adding to meal history:", { userId, foodName, details });

    // Use the helper function to find or create the food
    const food = await findOrCreateFood(
      foodName,
      parseNutritionDetails(details)
    );

    // ✅ Add Food to Meal History
    const newMeal = new MealHistory({
      userId,
      name: `Meal with ${foodName}`,
      date: new Date(),
      ingredients: [food._id], // Add food reference
      nutritionDetails: food.nutritionDetails,
    });

    await newMeal.save();

    console.log("✅ Food added successfully to history!");
    res.status(200).json({ success: true, message: "Food added!" });
    return;
  } catch (error) {
    console.error("❌ Error adding food to history:", error);
    res.status(500).json({ success: false, message: "Server error" });
    return;
  }
};

// ✅ Get Approximate Nutrition from Gemini
export const estimateFood = async (req: Request, res: Response) => {
  try {
    const { foodName } = req.body;

    if (!foodName) {
      res
        .status(400)
        .json({ success: false, message: "Food name is required" });
      return;
    }

    console.log("📌 Fetching estimated nutrition for:", foodName);

    // ✅ Gemini API Prompt
    const geminiMessage = await estimateNutritionsValues(foodName);

    console.log("✅ Estimated Nutrition Response:", geminiMessage);

    res.status(200).json({ success: true, message: geminiMessage });
    return;
  } catch (error) {
    console.error("❌ Error fetching estimated nutrition:", error);
    res.status(500).json({ success: false, message: "Server error" });
    return;
  }
};

export const addManualFood = async (req: Request, res: Response) => {
  try {
    const { name, nutritionDetails } = req.body;

    // Use the helper function to find or create the food
    const newFood = await findOrCreateFood("NOT_REAL_IGNORE", nutritionDetails);

    // Add this to Meal History
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

// ✅ Search Foods by Name
export const searchFoods = async (req: Request, res: Response) => {
  try {
    const searchQuery = req.params.query.trim();

    // ✅ Ignore empty queries
    if (!searchQuery) {
      res.status(400).json({ error: "Query cannot be empty." });
      return;
    }

    console.log("📡 Searching for:", searchQuery);

    // ✅ Find foods with names that contain the search query (case-insensitive)
    let matchingFoods = await Food.find({
      name: { $regex: searchQuery, $options: "i", $ne: "NOT_REAL_IGNORE" }, // Case-insensitive search and ignore "NOT_REAL_IGNORE" foods
    }).lean();

    console.log("🔍 Found:", matchingFoods.length, "foods before sorting");

    // ✅ Sort: Closest Match First
    matchingFoods.sort((a, b) => {
      const indexA = a.name.toLowerCase().indexOf(searchQuery.toLowerCase());
      const indexB = b.name.toLowerCase().indexOf(searchQuery.toLowerCase());
      return indexA - indexB; // Foods appearing earlier in the name come first
    });

    // ✅ Remove Duplicates (Keep only the first occurrence of each unique name)
    const uniqueFoods = [];
    const seenNames = new Set();

    for (const food of matchingFoods) {
      if (!seenNames.has(food.name)) {
        seenNames.add(food.name);
        uniqueFoods.push(food);
      }
      if (uniqueFoods.length >= 4) break; // ✅ Limit to 4 results
    }

    console.log("🔍 Returning:", uniqueFoods.length, "unique foods");

    res.status(200).json({ foods: uniqueFoods });
  } catch (error) {
    console.error("❌ Search Error:", error);
    res.status(500).json({ error: "Failed to search foods." });
  }
};

// ✅ API to Check if User Reached Their Goals
export const CheckGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // ✅ Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ error: "Invalid user ID" });
      return;
    }

    // ✅ Get current date (Year, Month, Day)
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    console.log(
      `📅 Checking goals for user: ${userId} on ${year}-${month + 1}-${day}`
    );

    // ✅ Fetch all meals for today & populate food ingredients
    const mealsToday = await MealHistory.find({
      userId,
      date: {
        $gte: new Date(year, month, day, 0, 0, 0), // Start of day
        $lt: new Date(year, month, day, 23, 59, 59), // End of day
      },
    }).populate("ingredients");

    console.log(`🍽️ Found ${mealsToday.length} meals today.`);

    // ✅ Sum Nutrition Values for Today
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
      `📊 Total Today: Cals: ${totalCals}, Protein: ${totalProtein}, Carbs: ${totalCarbs}, Fat: ${totalFat}`
    );

    // ✅ Get User's Daily Nutrition Goals
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { calories, protein, carbs, fat } = user.goals || {};
    console.log(
      `🎯 User Goals: Cals: ${calories}, Protein: ${protein}, Carbs: ${carbs}, Fat: ${fat}`
    );

    // ✅ Check Which Goals Are Reached
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
      message = "🎉 All nutrition goals reached! Great job! 🎯";
    } else {
      message = `✅ You've reached your ${reachedGoals.join(
        ", "
      )} goal(s)! Keep going!`;
    }

    console.log("📢 Goal Message:", message);
    res.status(200).json({ message });
  } catch (error) {
    console.error("❌ Error checking goals:", error);
    res.status(500).json({ error: "Failed to check goals." });
  }
};
