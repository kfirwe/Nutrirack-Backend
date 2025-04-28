import { Request, Response } from "express";
import User from "../models/User.model";
import {
  fetchMealTimesData,
  fetchNutrientGoalAchievementGraph,
  fetchUserMacrosGoals,
  get_graph_completions,
  getUserById,
  getUserMacrosToday,
} from "../services/user.service";
import { calculateMacros } from "../services/calculateMacros";
import {
  NutrientData,
  NutrientGoalAchievementParams,
} from "../types/graphs.types";

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { height, weight, goalWeight, age, gender, activityLevel } = req.body;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = (req.user as { id: string })?.id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const macros = calculateMacros({
      age,
      gender,
      height,
      weight,
      goalWeight,
      activityLevel,
    });

    Object.assign(user, {
      height,
      weight,
      goalWeight,
      age,
      gender,
      activityLevel,
      goals: macros,
      lastLogin: new Date(),
    });

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      goals: macros,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = (req.user as { id: string })?.id;
    const user = await getUserById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ userData: user });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to retrieve user info" });
  }
};

export const getMacrosForToday = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = (req.user as { id: string })?.id;
    const user = await getUserMacrosToday(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ totalMacros: user });
  } catch (error) {
    console.error("Error fetching user macros for today:", error);
    res.status(500).json({ message: "Failed to retrieve today's macros" });
  }
};

export const getUserMacrosGoals = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = (req.user as { id: string })?.id;
    const goals = await fetchUserMacrosGoals(userId);
    res.status(200).json({ goals });
  } catch (error) {
    console.error("Error fetching user macros goals:", error);
    res.status(500).json({ message: "Failed to retrieve user macros goals" });
  }
};

export const updateUserMacroGoals = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = (req.user as { id: string })?.id;
    const { calories, protein, carbs, fat } = req.body;

    if (calories == null || protein == null || carbs == null || fat == null) {
      res.status(400).json({ message: "All macro fields are required." });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    user.goals = { calories, protein, carbs, fat };
    await user.save();

    res
      .status(200)
      .json({ message: "Goals updated successfully", goals: user.goals });
  } catch (error) {
    console.error("Error updating user goals:", error);
    res.status(500).json({ message: "Failed to update goals" });
  }
};

export const getGraphCompletions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
    }
    const result = await get_graph_completions(
      userId as string,
      startDate as string,
      endDate as string,
      user
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching goal completion data:", error);
    res.status(500).json({ error: "Failed to get the user graph completions" });
  }
};

export const fetchNutrientGoalAchievement = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.params;
    const { nutrient, period } = req.query;
    if (
      period !== "1 week" &&
      period !== "1 month" &&
      period !== "3 month" &&
      period !== "6 month" &&
      period !== "1 year"
    ) {
      res.status(400).json({ error: "Invalid period type" });
      return;
    }
    if (
      nutrient !== "calories" &&
      (period as "1 week" | "1 month" | "3 month" | "6 month" | "1 year") &&
      nutrient !== "carbs" &&
      nutrient !== "fat" &&
      nutrient !== "protein"
    ) {
      res.status(400).json({ error: "Invalid nutrient type" });
      return;
    }
    const result = await fetchNutrientGoalAchievementGraph(
      userId,
      nutrient as "calories" | "protein" | "carbs" | "fat",
      period
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching nutrient data for graph:", error);
    res.status(500).json({ error: "Failed to get the user graph completions" });
  }
};

export const fetchMealTimesDataController = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    if (typeof userId !== "string") {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }

    const result = await fetchMealTimesData(
      userId,
      startDate as string,
      endDate as string
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching meal times data:", error);
    res
      .status(500)
      .json({ error: "Failed to get the user meal times graph data" });
  }
};
