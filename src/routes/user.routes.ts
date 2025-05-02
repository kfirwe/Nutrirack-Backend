import express from "express";
import {
  fetchMealTimesDataController,
  fetchNutrientGoalAchievement,
  generateMacrosForUser,
  getGraphCompletions,
  getMacrosForToday,
  getUser,
  getUserMacrosGoals,
  updateUserProfile,
  updateUserData,
  updateUserMacroGoals
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/", authenticate, getUser);
router.put("/", authenticate, updateUserData);
router.post("/macros/setup", authenticate, updateUserProfile);
router.get("/macros/generate", authenticate, generateMacrosForUser);
router.get("/macros/today", authenticate, getMacrosForToday);
router.get("/macros/goals", authenticate, getUserMacrosGoals);
router.put("/macros/goals", authenticate, updateUserMacroGoals);
router.get("/goal-completion/:userId", authenticate, getGraphCompletions);
router.get(
  "/nutrient-goal-achievement/:userId",
  authenticate,
  fetchNutrientGoalAchievement
);
router.get("/meal-times/:userId", authenticate, fetchMealTimesDataController);

export default router;
