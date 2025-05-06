import { Router } from "express";
import { getMealsByDate } from "../controllers/meal.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.get("/mealsbydate/:userId", authenticate, getMealsByDate);

export default router;