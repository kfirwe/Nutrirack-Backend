import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  getChats,
  createChat,
  sendMessage,
} from "../controllers/chat.controller";

const router = Router();

router.get("/", authenticate, getChats);
router.post("/new", authenticate, createChat);
router.post("/send", authenticate, sendMessage);

export default router;
