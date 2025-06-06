import User from "../models/User.model";
import MealHistory from "../models/MealHostory.model";
import { Macros } from "../types/nutrition.types";
import mongoose from "mongoose";
import _ from "lodash";
import { MealHistoryEntry, NutrientData } from "../types/graphs.types";
import { getMealsForUserInRange } from "./meal.service";

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

    const PROTEIN_NORMALIZED = 0.22;
    const CARBS_NORMALIZED = 0.18;
    const FAT_NORMALIZED = 0.5;
    const CALORIES_NORMALIZED = 0.1;

    const goalCompletionData = Object.entries(groupedMeals).map(
      ([date, meals]) => {
        const totalMacros = calculateTotalMacros(meals);

        const caloriesCompletion = Math.min(
          (totalMacros.calories / user.goals.calories) * CALORIES_NORMALIZED,
          1
        );
        const proteinCompletion = Math.min(
          (totalMacros.protein / user.goals.protein) * PROTEIN_NORMALIZED,
          1
        );
        const carbsCompletion = Math.min(
          (totalMacros.carbs / user.goals.carbs) * CARBS_NORMALIZED,
          1
        );
        const fatCompletion = Math.min(
          (totalMacros.fat / user.goals.fat) * FAT_NORMALIZED,
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
      (meal: { date: string | number | Date }) =>
        new Date(meal.date).toISOString().split("T")[0]
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

export const findMealAverageTimes = async (
  userId: string,
  mealType: string,
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
            $gte: new Date(startDate),
            $lte: new Date(endDate),
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
        },
      },
      {
        $match: { mealTime: mealType },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%d/%m", date: "$date" },
          },
          averageMealTime: { $avg: { $hour: "$date" } },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    return meals;
  } catch (error) {
    console.error("Error fetching meal average times:", error);
    return [];
  }
};

export const getUserRemainingMacros = async (userId: any) => {
  try {
    const goals = await findUserMacrosGoals(userId);
    const totalMacro = await findUserMacrosToday(userId);

    if (!goals || !totalMacro) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    console.log(totalMacro);

    const remainingMacros = {
      calories: goals.calories - totalMacro.calories,
      protein: goals.protein - totalMacro.protein,
      carbs: goals.carbs - totalMacro.carbs,
      fat: goals.fat - totalMacro.fat,
    };

    return remainingMacros;
  } catch (error) {
    console.error("Error fetching user's remaining macros:", error);
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  }
};

const isWithin = (val: number, goal: number) => {
  return val >= goal * 0.9 && val <= goal * 1.1;
};

export const generateWeeklyProgress = async (userId: string, goals: Macros) => {
  const { startOfWeek, endOfWeek } = getWeekRange(new Date());
  const meals = await getMealsForUserInRange(userId, startOfWeek, endOfWeek);
  const dailyMap = groupMealsByDay(meals);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const key = date.toDateString();
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });

    const totals = calculateTotalMacros(dailyMap.get(key) || []);
    const completed =
      isWithin(totals.calories, goals.calories) &&
      isWithin(totals.protein, goals.protein) &&
      isWithin(totals.carbs, goals.carbs) &&
      isWithin(totals.fat, goals.fat);

    return { day: dayName, completed };
  });
};

const getWeekRange = (today: Date) => {
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { startOfWeek: start, endOfWeek: end };
};

const groupMealsByDay = (meals: any[]) => {
  const map = new Map<string, any[]>();
  for (const meal of meals) {
    const key = new Date(meal.date).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(meal);
  }
  return map;
};
