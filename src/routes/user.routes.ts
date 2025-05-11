import express from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  updateUserProfile,
  getMacrosForToday,
  getUserMacrosGoals,
  updateUserMacroGoals,
  getUser,
  getGraphCompletions,
  fetchNutrientGoalAchievement,
  fetchMealTimesDataController,
  updateProfilePicture,
} from "../controllers/user.controller";

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
router.put("/profile-picture", authenticate, updateProfilePicture);

export default router;
