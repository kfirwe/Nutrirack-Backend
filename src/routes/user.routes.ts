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
  updateUserMacroGoals,
  updateProfilePicture,
  getWeekProgress,
  findMealAverageTimesController as getMealAverageTimesController,
  savePushTokenController,
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/", authenticate, getUser);
router.put("/", authenticate, updateUserData);
router.post("/macros/setup", authenticate, updateUserProfile);
router.post("/macros/generate", authenticate, generateMacrosForUser);
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
router.get(
  "/meal-times-average/:userId",
  authenticate,
  getMealAverageTimesController
);
router.put("/profile-picture", authenticate, updateProfilePicture);
router.put("/save-push-token", authenticate, savePushTokenController);

router.get("/progress/week", authenticate, getWeekProgress);

export default router;
