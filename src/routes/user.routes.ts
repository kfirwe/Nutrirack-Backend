import express from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { 
  updateUserProfile, 
  getMacrosForToday , 
  getUserMacrosGoals, 
  updateUserMacroGoals,
  getUser
} from "../controllers/user.controller";

const router = express.Router();

router.get("/", authenticate, getUser );
router.post("/profile-setup", authenticate, updateUserProfile);
router.get("/macros/today", authenticate, getMacrosForToday );
router.get("/macros/goals", authenticate, getUserMacrosGoals);
router.put("/macros/goals", authenticate, updateUserMacroGoals);

export default router;
