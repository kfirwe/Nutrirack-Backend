import { Router } from "express";
import {
  registerUser,
  loginUser,
  refreshToken,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/refresh", refreshToken);

export default router;
