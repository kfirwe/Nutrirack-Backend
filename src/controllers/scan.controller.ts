import { Request, Response, NextFunction } from 'express';
import { 
  callLogmealAPI, 
  callUSDADatasetAPI, 
  callGeminiAPI, 
  callOCR 
} from '../helpers/scan.helpers';

// Endpoint for processing a food image
export const scanFoodImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Assume an image file is uploaded (using middleware like multer)
    const image = req.file;
    if (!image) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }
    
    // Call the LogMeal API (or your chosen service)
    const nutritionData = await callLogmealAPI(image);
    res.status(200).json({ nutrition: nutritionData });
  } catch (error) {
    next(error);
  }
};

// Endpoint for processing a barcode
export const scanBarcode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { barcode } = req.body;
    if (!barcode) {
      res.status(400).json({ error: 'No barcode provided' });
      return;
    }
    
    // Call the USDA dataset API (or similar) to get nutrition info
    const nutritionData = await callUSDADatasetAPI(barcode);
    res.status(200).json({ nutrition: nutritionData });
  } catch (error) {
    next(error);
  }
};

// Endpoint for processing a menu image
export const scanMenuImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = req.file;
    if (!image) {
      res.status(400).json({ error: 'No menu image provided' });
      return;
    }
    
    // Use OCR to extract text from the menu image
    const menuText = await callOCR(image);
    
    // Use an AI service (Gemini API, ChatGPT, etc.) to generate a message from the extracted text
    const aiMessage = await callGeminiAPI(menuText);
    res.status(200).json({ menuText, aiMessage });
  } catch (error) {
    next(error);
  }
};
