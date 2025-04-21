import { Request, Response } from "express";
import User from "../models/User.model";
import { calculateMacros } from "../services/calculateMacros";
import {
  findUserById,
  findUserMacrosGoals,
  findUserMacrosToday,
} from "../services/user.service";

export const setupUserMacrosAndGoals = async (req: Request, res: Response) => {
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

    const macros = calculateMacros({ age, gender, height, weight, goalWeight, activityLevel });

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

    Object.assign(user, {
      height,
      weight,
      goalWeight,
      age,
      gender,
      activityLevel,
      lastLogin: new Date(),
    });

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully"
    });
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
      return
    }

    const userId = (req.user as { id: string })?.id;
    const { calories, protein, carbs, fat } = req.body;

    if (
      calories == null ||
      protein == null ||
      carbs == null ||
      fat == null
    ) {
      res.status(400).json({ message: "All macro fields are required." });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return
    }

    user.goals = { calories, protein, carbs, fat };
    await user.save();

    res.status(200).json({ message: "Goals updated successfully", goals: user.goals });
  } catch (error) {
    console.error("Error updating user goals:", error);
    res.status(500).json({ message: "Failed to update goals" });
  }
};
