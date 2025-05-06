import { Router } from "express";
import multer from "multer";
import {
  scanFoodImage,
  scanBarcode,
  scanMenuImage,
} from "../controllers/scan.controller";
import { authenticate } from "../middlewares/authMiddleware";
import {
  addManualFood,
  addRecentFood,
  CheckGoals,
  recentFoods,
} from "../controllers/meal.controller";
import { estimateFood, searchFoods } from "../controllers/food.controller";

const router = Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/food", authenticate, upload.single("image"), scanFoodImage);
router.post("/barcode", authenticate, scanBarcode);
router.post("/menu", authenticate, upload.single("image"), scanMenuImage);

router.get("/recent-foods/:userId", authenticate, recentFoods);
router.post("/add-to-history", authenticate, addRecentFood);
router.post("/add-custom-food", authenticate, addManualFood);
router.get("/check-goals/:userId", authenticate, CheckGoals);

router.get("/search-foods/:query", authenticate, searchFoods);
router.post("/estimate-nutrition", authenticate, estimateFood);

export default router;
