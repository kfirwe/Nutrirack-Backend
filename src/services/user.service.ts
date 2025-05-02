import User from "../models/User.model";
import MealHistory from "../models/MealHostory.model";
import { Macros } from "../types/nutrition.types";
import mongoose from "mongoose";
import _ from "lodash";
import { MealHistoryEntry, NutrientData } from "../types/graphs.types";

export const calculateTotalMacros = (meals: any[]): Macros => {
  return meals.reduce(
    (acc, meal) => {
      acc.calories += meal.nutritionDetails.cals || 0;
      acc.protein += meal.nutritionDetails.protein || 0;
      acc.carbs += meal.nutritionDetails.carbs || 0;
      acc.fat += meal.nutritionDetails.fat || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
};

export const findUserById = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }
    return user;
  } catch (error) {
    console.error(`Failed to fetch user with ID ${userId}:`, error);
    throw new Error("Error fetching user.");
  }
};

export const findUserMacrosToday = async (userId: string) => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const meals = await MealHistory.find({
    userId,
    date: { $gte: startOfDay, $lt: endOfDay },
  });

  return calculateTotalMacros(meals);
};

export const findUserMacrosGoals = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user) throw new Error("User not found");

  const { goals } = user;
  if (!goals) throw new Error("Goals not set for user");

  return goals;
};

export const findGraphCompletions = async (
  userId: string,
  startDate: string | Date,
  endDate: string | Date,
  user: any
) => {
  try {
    if (
      (!endDate || endDate === "undefined" || endDate == "null") &&
      startDate
    ) {
      if (startDate === "1 week")
        startDate = new Date(new Date().setDate(new Date().getDate() - 7));
      else if (startDate === "1 month")
        startDate = new Date(new Date().setMonth(new Date().getMonth() - 1));
      else if (startDate === "3 month")
        startDate = new Date(new Date().setMonth(new Date().getMonth() - 3));
      else if (startDate === "6 month")
        startDate = new Date(new Date().setMonth(new Date().getMonth() - 6));
      else if (startDate === "1 year")
        startDate = new Date(
          new Date().setFullYear(new Date().getFullYear() - 1)
        );
    }
    endDate = new Date();

    const meals = await MealHistory.find({
      userId: new mongoose.Types.ObjectId(userId),
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
    }).populate("ingredients");

    const groupedMeals: Record<string, any[]> = _.groupBy(
      meals,
      (meal: { date: Date }) => new Date(meal.date).toISOString().split("T")[0]
    );

    const goalCompletionData = Object.entries(groupedMeals).map(
      ([date, meals]) => {
        const totalMacros = calculateTotalMacros(meals);

        const caloriesCompletion = Math.min(
          (totalMacros.calories / user.goals.calories) * 0.25,
          1
        );
        const proteinCompletion = Math.min(
          (totalMacros.protein / user.goals.protein) * 0.25,
          1
        );
        const carbsCompletion = Math.min(
          (totalMacros.carbs / user.goals.carbs) * 0.25,
          1
        );
        const fatCompletion = Math.min(
          (totalMacros.fat / user.goals.fat) * 0.25,
          1
        );

        const goalCompletionPercentage =
          caloriesCompletion +
          proteinCompletion +
          carbsCompletion +
          fatCompletion;

        return {
          date,
          goalCompletionPercentage,
        };
      }
    );

    return goalCompletionData;
  } catch (error) {
    console.error("Error fetching goal completion data:", error);
    return;
  }
};

export const findNutrientGoalAchievementGraph = async (
  userId: string,
  nutrient: string,
  period: "1 week" | "1 month" | "3 month" | "6 month" | "1 year"
): Promise<NutrientData[] | undefined> => {
  try {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const goal = user.goals[nutrient as keyof typeof user.goals];

  if (nutrient === "calories") {
    nutrient = "cals";
  }

  let startDate = new Date();
  let endDate = new Date();

  if (period === "1 week") {
    startDate.setDate(endDate.getDate() - 7);
  } else if (period === "1 month") {
    startDate.setMonth(endDate.getMonth() - 1);
  } else if (period === "3 month") {
    startDate.setMonth(endDate.getMonth() - 3);
  } else if (period === "6 month") {
    startDate.setMonth(endDate.getMonth() - 6);
  } else if (period === "1 year") {
    startDate.setFullYear(endDate.getFullYear() - 1);
  }

  const meals: MealHistoryEntry[] = await MealHistory.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  });

  const groupedMeals = _.groupBy(
    meals,
    (meal: { date: string | number | Date; }) => new Date(meal.date).toISOString().split("T")[0]
  );

  const nutrientData: NutrientData[] = Object.entries(groupedMeals).map(
    ([date, meals]) => {
      const totalNutrientIntake = meals.reduce((sum, meal) => {
        return (
          sum +
          (meal.nutritionDetails[
            nutrient as keyof typeof meal.nutritionDetails
          ] || 0)
        );
      }, 0);

      return {
        date: new Date(date),
        intake: totalNutrientIntake,
        goal: goal,
        achievementPercentage: totalNutrientIntake / goal,
      };
    }
  );

  return nutrientData;
} catch (error) {
  console.error("Error fetching nutrient goal achievement graph:", error);
  return;
}
};

export const findMealTimesData = async (
  userId: string,
  startDate: string | Date,
  endDate: string | Date
) => {
  try {
    if (
      (!endDate || endDate === "undefined" || endDate == "null") &&
      startDate
    ) {
      if (startDate === "1 week")
        startDate = new Date(new Date().setDate(new Date().getDate() - 7));
      else if (startDate === "1 month")
        startDate = new Date(new Date().setMonth(new Date().getMonth() - 1));
      else if (startDate === "3 month")
        startDate = new Date(new Date().setMonth(new Date().getMonth() - 3));
      else if (startDate === "6 month")
        startDate = new Date(new Date().setMonth(new Date().getMonth() - 6));
      else if (startDate === "1 year")
        startDate = new Date(
          new Date().setFullYear(new Date().getFullYear() - 1)
        );
    }
    endDate = new Date();

    const meals = await MealHistory.aggregate([
      {
        $match: {
          userId: userId,
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $addFields: {
          mealTime: {
            $cond: {
              if: { $lt: [{ $hour: "$date" }, 12] },
              then: "Breakfast",
              else: {
                $cond: {
                  if: { $lt: [{ $hour: "$date" }, 18] },
                  then: "Lunch",
                  else: "Dinner",
                },
              },
            },
          },
          mealDecimalTime: {
            $add: [{ $hour: "$date" }, { $divide: [{ $minute: "$date" }, 60] }],
          },
        },
      },
      {
        $group: {
          _id: "$mealTime",
          averageMealTime: { $avg: "$mealDecimalTime" },
        },
      },
      {
        $project: {
          mealTime: "$_id",
          averageMealTime: 1,
          _id: 0,
        },
      },
    ]);

    return meals;
  } catch (error) {
    console.error("Error fetching meal times data:", error);
    return [];
  }
};
