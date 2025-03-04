import { Router } from 'express';
import multer from 'multer';
import { scanFoodImage, scanBarcode, scanMenuImage } from '../controllers/scan.controller';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();
const upload = multer({ dest: 'uploads/' });

// Protected routes: the user must be authenticated to access these endpoints.
router.post('/scan/food', authenticate, upload.single('image'), scanFoodImage);
router.post('/scan/barcode', authenticate, scanBarcode);
router.post('/scan/menu', authenticate, upload.single('image'), scanMenuImage);

export default router;
