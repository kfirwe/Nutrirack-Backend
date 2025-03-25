import { Router } from "express";
import multer from "multer";
import {
  scanFoodImage,
  scanBarcode,
  scanMenuImage,
  recentFoods,
  addRecentFood,
  estimateFood,
  addManualFood,
  searchFoods,
  CheckGoals,
} from "../controllers/scan.controller";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();
const storage = multer.memoryStorage(); // Store file in memory
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Protected routes: the user must be authenticated to access these endpoints.
router.post("/food", authenticate, upload.single("image"), scanFoodImage);
router.post("/barcode", authenticate, scanBarcode);
router.post("/menu", authenticate, upload.single("image"), scanMenuImage);
router.get("/recent-foods/:userId", authenticate, recentFoods);
router.post("/add-to-history", authenticate, addRecentFood);
router.post("/estimate-nutrition", authenticate, estimateFood);
router.post("/add-custom-food", authenticate, addManualFood);
router.get("/search-foods/:query", authenticate, searchFoods);
router.get("/check-goals/:userId", authenticate, CheckGoals);

export default router;
