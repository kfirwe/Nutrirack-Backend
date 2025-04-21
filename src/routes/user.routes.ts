import express from "express";
import {
  generateMacrosForUser,
  getMacrosForToday,
  getUser,
  getUserMacrosGoals,
  setupUserMacrosAndGoals,
  updateUserData,
  updateUserMacroGoals
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/", authenticate, getUser);
router.put("/", authenticate, updateUserData);
router.post("/macros/setup", authenticate, setupUserMacrosAndGoals);
router.get("/macros/generate", authenticate, generateMacrosForUser);
router.get("/macros/today", authenticate, getMacrosForToday);
router.get("/macros/goals", authenticate, getUserMacrosGoals);
router.put("/macros/goals", authenticate, updateUserMacroGoals);

export default router;
