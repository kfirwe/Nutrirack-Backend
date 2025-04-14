import User from "../models/User.model";
import { Request, Response } from "express";
import {
  fetchUserMacrosGoals,
  getUserMacrosToday,
} from "../services/user.service";

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { calories, protein, carbs, fat, height, weight, age } = req.body;
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

    user.goals = { calories, protein, carbs, fat };
    user.height = height;
    user.weight = weight;
    if (age) user.age = age;
    user.lastLogin = new Date();

    await user.save();

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
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
