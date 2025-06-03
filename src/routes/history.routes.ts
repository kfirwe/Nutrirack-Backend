import { Router } from "express";
import { deleteMealByMealId, getMealsByDate, updateMeal } from "../controllers/meal.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.get("/mealsbydate/:userId", authenticate, getMealsByDate);
router.delete("/:mealId", authenticate, deleteMealByMealId);
router.put("/", authenticate, updateMeal);

export default router;