import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  findOrCreateFood,
  parseNutritionDetails
} from "../helpers/scan.helpers";
import MealHistory from "../models/MealHostory.model";
import User from "../models/User.model";
import { getMealHistories } from "../services/meal.service";
import { getUserById } from "../services/user.service";

export const recentFoods = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const mealHistories = await getMealHistories(userId);

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
    console.log("📌 Adding food to meal history...");
    const { userId, foodName, details } = req.body;

    if (!userId || !foodName || !details) {
      res.status(400).json({ success: false, message: "Missing data" });
      return;
    }

    console.log("📌 Adding to meal history:", { userId, foodName, details });

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

    console.log("✅ Food added successfully to history!");
    res.status(200).json({ success: true, message: "Food added!" });
    return;
  } catch (error) {
    console.error("❌ Error adding food to history:", error);
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

    const user = await getUserById(userId);

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
