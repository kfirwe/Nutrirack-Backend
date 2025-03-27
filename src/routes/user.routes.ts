import express from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { 
  updateUserProfile, 
  getMacrosForToday , 
  getUserMacrosGoals 
} from "../controllers/user.controller";

const router = express.Router();

router.post("/profile-setup", authenticate, updateUserProfile);
router.get("/macros/today", authenticate, getMacrosForToday );
router.get("/macros/goals", authenticate, getUserMacrosGoals);

export default router;
