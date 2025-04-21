type MacroInput = {
    age: number;
    gender: "male" | "female";
    height: number;
    weight: number;
    goalWeight: number;
    activityLevel: number;
  };
  
  type MacroOutput = {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  
  export function calculateMacros({
    age,
    gender,
    height,
    weight,
    goalWeight,
    activityLevel,
  }: MacroInput): MacroOutput {
    const bmr =
      gender === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
  
    let calories = bmr * activityLevel;
  
    if (goalWeight < weight) calories -= 300;
    else if (goalWeight > weight) calories += 300;
    calories = Math.round(calories);
  
    let proteinRatio = 0.3;
    let carbsRatio = 0.4;
    let fatRatio = 0.3;
  
    if (goalWeight < weight) {
      proteinRatio = 0.4;
      carbsRatio = 0.3;
      fatRatio = 0.3;
    } else if (goalWeight > weight) {
      proteinRatio = 0.35;
      carbsRatio = 0.45;
      fatRatio = 0.2;
    }
  
    const protein = Math.round((calories * proteinRatio) / 4);
    const carbs = Math.round((calories * carbsRatio) / 4);
    const fat = Math.round((calories * fatRatio) / 9);
  
    return { calories, protein, carbs, fat };
  }
  