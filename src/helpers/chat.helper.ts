import axios from "axios";
import mongoose from "mongoose";
import MealHistory from "../models/MealHostory.model";
import User from "../models/User.model";

export const getUserMealHistory = async (userId: string) => {
  try {
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

    return { totalCalories, totalProtein, totalCarbs, totalFat, meals };
  } catch (error) {
    console.error("Error fetching meal history:", error);
    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: [],
    };
  }
};

export const generateAIResponse = async (
  messages: { sender: string; text: string }[],
  userId: string
) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw Error("User not found");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mealHistory = await MealHistory.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: today },
    }).populate("ingredients");
    const mealSummary = mealHistory
      .map(
        (meal) =>
          `At ${meal.createdAt.toISOString()}, you had ${
            meal.ingredients
              .map((ingredient) =>
                ingredient.name != "NOT_REAL_IGNORE" ? ingredient.name : null
              )
              .filter((name) => name)
              .join(", ") || "an unknown meal"
          }. It contained ${meal.nutritionDetails.cals} calories, ${
            meal.nutritionDetails.protein
          }g of protein, ${meal.nutritionDetails.fat}g
             of fat, and ${meal.nutritionDetails.carbs}g of carbs.`
      )
      .join("\n");

    const { totalCalories, totalProtein, totalCarbs, totalFat, meals } =
      await getUserMealHistory(userId);

    const remainingCalories = Math.max(user.goals.calories - totalCalories, 0);
    const remainingProtein = Math.max(user.goals.protein - totalProtein, 0);
    const remainingCarbs = Math.max(user.goals.carbs - totalCarbs, 0);
    const remainingFat = Math.max(user.goals.fat - totalFat, 0);

    const conversationHistory = messages
      .map(
        (msg) => `${msg.sender === "user" ? "User" : "NutriTrack"}: ${msg.text}`
      )
      .join("\n");

    const prompt = `
        You are NutriTrack, a smart AI nutrition assistant. Help the user with meal choices, nutrition facts, and health tips based on the conversation history.
  
        ${conversationHistory}

        Meal history:
        ${mealSummary}

        Remaining daily goals for today:
        Calories: ${remainingCalories} kcal
        Protein: ${remainingProtein}g
        Carbs: ${remainingCarbs}g
        Fat: ${remainingFat}g

        You should only refer to the meal history and remaining goals if the user asks about whether they can eat something or needs advice on food choices based on their goals. For general queries about food or nutrition, do not refer to meal history or goals.
  
        Respond in a friendly, helpful, and informative way.
      `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
      { contents: [{ parts: [{ text: prompt }] }] },
      {
        params: { key: process.env.GEMINI_API_KEY },
        headers: { "Content-Type": "application/json" },
      }
    );

    return (
      response.data.candidates[0]?.content?.parts[0]?.text ||
      "I'm here to help with nutrition. How can I assist?"
    );
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return "I encountered an issue, please try again.";
  }
};
