import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  CreateReminder,
  DeleteReminder,
  getReminders,
} from "../controllers/reminder.controller";

const router = Router();

router.get("/", authenticate, getReminders);
router.post("/", authenticate, CreateReminder);
router.delete("/:id", authenticate, DeleteReminder);

export default router;
