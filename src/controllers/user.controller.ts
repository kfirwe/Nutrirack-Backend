import User from "../models/User.model";
import { Request, Response } from "express";

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { calories, protein, carbs, fat, height, weight, age } = req.body;
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const userId = (req.user as { id: string })?.id;

    // Ensure user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Update user profile with goals and body stats
    user.goals = { calories, protein, carbs, fat };
    user.height = height;
    user.weight = weight;
    if (age) user.age = age; // Only update if provided
    user.lastLogin = new Date();

    await user.save();

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
};
