import { Request, Response } from "express";
import MealHistory from "../models/MealHostory.model";
import { findOrCreateFood } from "../services/food.service";
import {
  addRecentFoodService,
  deleteMealById,
  getMealsByDateService,
  getRecentFoodsService,
} from "../services/meal.service";
import { findUserById } from "../services/user.service";

export const recentFoods = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const recentFoods = await getRecentFoodsService(userId);

    res.status(200).json({ recentFoods });
  } catch (error) {
    console.error("Error fetching recent foods:", error);
    res.status(500).json({ error: "Failed to fetch recent foods" });
  }
};

export const addRecentFood = async (req: Request, res: Response) => {
  try {
    const { userId, foodName, details } = req.body;

    if (!userId || !foodName || !details) {
      res.status(400).json({ success: false, message: "Missing data" });
      return;
    }

    await addRecentFoodService(userId, foodName, details);

    res.status(200).json({ success: true, message: "Food added!" });
  } catch (error) {
    console.error("Error adding food to history:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const addManualFood = async (req: Request, res: Response) => {
  try {
    let { name, nutritionDetails } = req.body;

    if (!name) name = "Custom Food";

    const newFood = await findOrCreateFood(name, nutritionDetails);

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

export const CheckGoals = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

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

    const user = await findUserById(userId);

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
      res.status(200).json({ message: "NO_GOALS_REACHED" });
      return;
    } else if (reachedGoals.length === 4) {
      message = "🎉 All nutrition goals reached! Great job! 🎯";
    } else {
      message = `✅ You've reached your ${reachedGoals.join(
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

export const getMealsByDate = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== "string") {
      res.status(400).json({ error: "Date query parameter is required" });
      return;
    }

    const meals = await getMealsByDateService(userId, date);
    res.status(200).json({ meals });
  } catch (error) {
    console.error("Error fetching meals by date:", error);
    res.status(500).json({ error: "Failed to fetch meals" });
  }
};

export const deleteMealByMealId = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { id: string }).id;
    const { mealId } = req.params;

    if (typeof mealId !== "string") {
      res.status(400).json({ error: "Invalid mealId" });
      return;
    }

    const meals = await deleteMealById(userId, mealId);
    res.status(200).json({ meals });
  } catch (error) {
    console.error("Error deleting meal:", error);
    res.status(500).json({ error: "Failed to delete meal" });
  }
};

export const updateMeal = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { id: string })?.id;
    const { mealId, nutritionDetails } = req.body;

    if (!mealId || !nutritionDetails) {
      res.status(400).json({ message: "mealId and nutritionDetails are required." });
      return
    }

    const meal = await MealHistory.findOne({ _id: mealId, userId });

    if (!meal) {
      res.status(404).json({ message: "Meal not found." });
      return
    }

    meal.nutritionDetails = {
      ...meal.nutritionDetails,
      ...nutritionDetails,
    };

    await meal.save();

    res.status(200).json({
      message: "Meal updated successfully",
      meal,
    });
  } catch (error) {
    console.error("Error updating meal:", error);
    res.status(500).json({ message: "Failed to update meal." });
  }
};
