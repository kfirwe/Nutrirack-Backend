import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  getChats,
  createChat,
  sendMessage,
} from "../controllers/chat.controller";

const router = Router();

router.get("/", authenticate, getChats); // Get user chats
router.post("/new", authenticate, createChat); // Create new chat
router.post("/send", authenticate, sendMessage); // Send message

export default router;
