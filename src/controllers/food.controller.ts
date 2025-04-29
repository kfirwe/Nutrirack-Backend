import { Request, Response } from "express";
import {
  estimateNutritionsValues,
  findMatchingFoods,
  getUniqueTopFoods,
  sortFoodsByRelevance,
} from "../services/food.service";

export const searchFoods = async (req: Request, res: Response) => {
  try {
    const searchQuery = req.params.query.trim();

    if (!searchQuery) {
      res.status(400).json({ error: "Query cannot be empty." });
      return;
    }

    let matchingFoods = await findMatchingFoods(searchQuery);
    const sortedFoods = sortFoodsByRelevance(matchingFoods, searchQuery);
    const uniqueFoods = getUniqueTopFoods(sortedFoods);

    console.log("Returning:", uniqueFoods.length, "unique foods");

    res.status(200).json({ foods: uniqueFoods });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: "Failed to search foods." });
  }
};

export const estimateFood = async (req: Request, res: Response) => {
  try {
    const { foodName } = req.body;

    if (!foodName) {
      res
        .status(400)
        .json({ success: false, message: "Food name is required" });
      return;
    }

    const geminiMessage = await estimateNutritionsValues(foodName);

    res.status(200).json({ success: true, message: geminiMessage });
    return;
  } catch (error) {
    console.error("Error fetching estimated nutrition:", error);
    res.status(500).json({ success: false, message: "Server error" });
    return;
  }
};
