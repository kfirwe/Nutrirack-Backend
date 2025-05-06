export interface NutrientGoalAchievementParams {
  userId: string;
  nutrient: string;
  period: string;
}

export interface MealHistoryEntry {
  date: Date;
  ingredients: Ingredient[];
  nutritionDetails: {
    cals?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export interface Ingredient {
  nutritionDetails: Record<string, number>;
}

export interface NutrientData {
  date: Date;
  intake: number;
  goal: number;
  achievementPercentage: number;
}
