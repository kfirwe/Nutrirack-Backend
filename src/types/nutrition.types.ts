export interface Macros {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }
  
  export interface NutritionDetails {
    cals?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  }

  export interface USDAFoodNutrient {
    nutrientName: string;
    value: number;
  }

  export interface USDANutrition {
    fat: number | null;
    carbs: number | null;
    cals: number | null;
    protein: number | null;
  }


  export interface RecognitionResult {
    name: string;
    prob: number;
  }

  export interface SegmentationResult {
    recognition_results: RecognitionResult[];
  }

