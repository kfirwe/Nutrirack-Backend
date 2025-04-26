import { Request, Response } from "express";
import Food from "../models/Food.model";
import { estimateNutritionsValues } from "../helpers/scan.helpers";

export const searchFoods = async (req: Request, res: Response) => {
    try {
      const searchQuery = req.params.query.trim();
  
      if (!searchQuery) {
        res.status(400).json({ error: "Query cannot be empty." });
        return;
      }
  
      console.log("📡 Searching for:", searchQuery);
  
      let matchingFoods = await Food.find({
        name: { $regex: searchQuery, $options: "i", $ne: "NOT_REAL_IGNORE" }, 
      }).lean();
  
      console.log("🔍 Found:", matchingFoods.length, "foods before sorting");
  
      matchingFoods.sort((a, b) => {
        const indexA = a.name.toLowerCase().indexOf(searchQuery.toLowerCase());
        const indexB = b.name.toLowerCase().indexOf(searchQuery.toLowerCase());
        return indexA - indexB; 
      });
  
      const uniqueFoods = [];
      const seenNames = new Set();
  
      for (const food of matchingFoods) {
        if (!seenNames.has(food.name)) {
          seenNames.add(food.name);
          uniqueFoods.push(food);
        }
        if (uniqueFoods.length >= 4) break;
      }
  
      console.log("🔍 Returning:", uniqueFoods.length, "unique foods");
  
      res.status(200).json({ foods: uniqueFoods });
    } catch (error) {
      console.error("❌ Search Error:", error);
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
  
      console.log("📌 Fetching estimated nutrition for:", foodName);
  
      const geminiMessage = await estimateNutritionsValues(foodName);
  
      console.log("✅ Estimated Nutrition Response:", geminiMessage);
  
      res.status(200).json({ success: true, message: geminiMessage });
      return;
    } catch (error) {
      console.error("❌ Error fetching estimated nutrition:", error);
      res.status(500).json({ success: false, message: "Server error" });
      return;
    }
  };
  