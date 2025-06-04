import { Request, Response } from "express";
import Reminder from "../models/Reminder.model";

export const getReminders = async (req: Request, res: Response) => {
  try {
    const reminders = await Reminder.find({
      userId: (req.user as { id: string })?.id,
    }).sort({
      createdAt: -1,
    });

    res.json(reminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const CreateReminder = async (req: Request, res: Response) => {
  try {
    const { reminderTime, notificationMessage, mealType } = req.body;

    if (!reminderTime || !notificationMessage || !mealType) {
      res.status(400).json({
        message: "All fields are required",
      });
      return;
    }

    const reminderDate = new Date(reminderTime);
    if (reminderDate <= new Date()) {
      res.status(400).json({
        message: "Reminder time must be in the future",
      });
      return;
    }

    const validMealTypes = ["breakfast", "lunch", "dinner", "snack"];
    if (!validMealTypes.includes(mealType)) {
      res.status(400).json({
        message: "Invalid meal type",
      });
      return;
    }

    const reminder = new Reminder({
      userId: (req.user as { id: string })?.id,
      reminderTime: reminderDate,
      notificationMessage: notificationMessage.trim(),
      mealType,
      notificationSent: false,
    });

    await reminder.save();

    res.status(201).json(reminder);
  } catch (error) {
    console.error("Error creating reminder:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const DeleteReminder = async (req: Request, res: Response) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      userId: (req.user as { id: string })?.id,
    });

    if (!reminder) {
      res.status(404).json({ message: "Reminder not found" });
      return;
    }

    res.json({ message: "Reminder deleted successfully" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    res.status(500).json({ message: "Server error" });
  }
};
