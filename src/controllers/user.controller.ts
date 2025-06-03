import { Request, RequestHandler, Response } from "express";
import User from "../models/User.model";
import { calculateMacros } from "../services/calculateMacros";
import {
  findGraphCompletions,
  findMealAverageTimes,
  findMealTimesData,
  findNutrientGoalAchievementGraph,
  findUserById,
  findUserMacrosGoals,
  findUserMacrosToday,
  generateWeeklyProgress,
} from "../services/user.service";
import Expo from "expo-server-sdk";

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { height, weight, goalWeight, age, gender, activityLevel } = req.body;

    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = (req.user as { id: string })?.id;
    const user = await findUserById(userId);

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

export const updateUserData = async (req: Request, res: Response) => {
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

    const updates: Partial<typeof user> = {};
    if (height !== undefined) updates.height = height;
    if (weight !== undefined) updates.weight = weight;
    if (goalWeight !== undefined) updates.goalWeight = goalWeight;
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;
    if (activityLevel !== undefined) updates.activityLevel = activityLevel;

    Object.assign(user, updates, { lastLogin: new Date() });

    await user.save();

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const generateMacrosForUser = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { id: string })?.id;
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const macros = calculateMacros(user);

    res.status(200).json({
      message: "Macros generated successfully",
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
    const user = await findUserById(userId);

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
    const user = await findUserMacrosToday(userId);

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
    const goals = await findUserMacrosGoals(userId);
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

    const user = await findUserById(userId);
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
    const result = await findGraphCompletions(
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
    const result = await findNutrientGoalAchievementGraph(
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

    const result = await findMealTimesData(
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

export const findMealAverageTimesController = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, mealType } = req.query;

    if (typeof userId !== "string") {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }

    const result = await findMealAverageTimes(
      userId,
      mealType as string,
      startDate as string,
      endDate as string
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching meal times average data:", error);
    res
      .status(500)
      .json({ error: "Failed to get the user meal times average graph data" });
  }
};

export const updateProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as { id: string })?.id;
    const { image } = req.body;

    if (!image) {
      res.status(400).json({ message: "Image is required" });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: image },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      message: "Profile picture updated successfully",
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const savePushTokenController = async (req: Request, res: Response) => {
  console.log("here");
  const userId = (req.user as { id: string })?.id;
  const { pushToken } = req.body;
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error("Invalid Expo push token");
    return;
  }
  try {
    console.log("Received push token:", pushToken);
    await User.findByIdAndUpdate(userId, { pushToken });
    res.status(200).json({ message: "Push token saved successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error saving push token" });
  }
};

export const getWeekProgress: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const userId = (req.user as { id: string }).id;
    const user = await User.findById(userId);

    if (!user || !user.goals) {
      res.status(404).json({ message: "User or goals not found" });
      return;
    }

    const week = await generateWeeklyProgress(userId, user.goals);
    res.status(200).json({ week });
  } catch (err) {
    console.error("Error in getWeekProgress:", err);
    res.status(500).json({ message: "Failed to get weekly progress" });
  }
};
