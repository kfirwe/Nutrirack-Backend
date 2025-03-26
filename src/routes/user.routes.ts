import express from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { updateUserProfile } from "../controllers/user.controller";

const router = express.Router();

router.post("/profile-setup", authenticate, updateUserProfile);

export default router;
