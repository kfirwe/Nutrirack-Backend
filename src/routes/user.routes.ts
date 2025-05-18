import express from "express";
import {
  fetchMealAverageTimesController,
  fetchMealTimesDataController,
  fetchNutrientGoalAchievement,
  getGraphCompletions,
  getMacrosForToday,
  getUser,
  getUserMacrosGoals,
  getWeekProgress,
  updateProfilePicture,
  updateUserMacroGoals,
  updateUserProfile,
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/", authenticate, getUser);
router.post("/profile-setup", authenticate, updateUserProfile);
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
  fetchMealAverageTimesController
);
router.put("/profile-picture", authenticate, updateProfilePicture);

router.get("/progress/week", authenticate, getWeekProgress);


export default router;
