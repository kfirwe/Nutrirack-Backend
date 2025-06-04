import moment from "moment";
import { sendPushNotification } from "../services/push.service";
import User from "../models/User.model";
import Reminder from "../models/Reminder.model";
import MealHistory from "../models/MealHostory.model";
import { getUserRemainingMacros } from "../services/user.service";
import { generateAIResponseRecommendedFood } from "../helpers/chat.helper";

async function sendPendingNotifications() {
  const currentTime = moment().utc();
  const reminders = await Reminder.find({
    reminderTime: { $lte: currentTime.toDate() },
    notificationSent: false,
  });

  for (let reminder of reminders) {
    const { userId, notificationMessage } = reminder;

    const user = await User.findById(userId);
    if (user && user.pushToken) {
      await sendPushNotification(user.pushToken, notificationMessage);

      await Reminder.findByIdAndUpdate(reminder._id, {
        notificationSent: true,
      });
      console.log(
        `Notification sent to user ${userId} for reminder: ${notificationMessage}`
      );
    }
  }
}

async function RecommendFoodThenPush() {
  const now = moment().utc();
  const time = now.format("HH:mm");
  console.log(time);
  if (now.hour() === 16 && now.minute() >= 0) {
    // Also, if user didnt eat from 12:00 to 16:00, recommend him a meal, see how much nutrition values for the day remaining, and see some food from his 12:00 to 16:00 history that he can eat
    const users = await User.find({
      pushToken: { $exists: true, $ne: null },
    });
    for (let user of users) {
      const startOfWindow = moment().utc().startOf("day").hour(16).toDate();
      const now = moment().utc().toDate();
      const existingReminder = await Reminder.findOne({
        userId: user._id,
        reminderTime: {
          $gte: startOfWindow,
          $lte: now,
        },
      });

      if (existingReminder) {
        continue;
      }

      const meals = await MealHistory.find({
        userId: user._id,
        date: {
          $gte: moment().startOf("day").toDate(),
          $lte: moment().endOf("day").toDate(),
        },
      }).sort({ date: -1 });

      const lastMeal = meals[0];

      if (
        lastMeal &&
        moment(lastMeal.date).isBetween(moment().hour(12), moment().hour(16))
      ) {
        // User has eaten between 12:00 and 16:00
      } else {
        // Recommend a meal based on remaining nutrition values
        const remainingNutrition = await getUserRemainingMacros(user._id);
        console.log(
          `Remaining nutrition for user ${user._id}:`,
          remainingNutrition
        );
        const recommendedMeal = await generateAIResponseRecommendedFood(
          user._id,
          time,
          remainingNutrition
        );
        console.log(`Recommended meal for user ${user._id}:`, recommendedMeal);
        if (recommendedMeal && user && user.pushToken) {
          await sendPushNotification(
            user.pushToken,
            `We recommend you to eat ${recommendedMeal} for your remaining nutrition values.`
          );
          await Reminder.create({
            userId: user._id,
            notificationMessage: `We recommend you to eat ${recommendedMeal} for your remaining nutrition values.`,
            reminderTime: moment().toDate(),
            mealType: moment().hour() <= 18 ? "lunch" : "dinner",
            notificationSent: true,
          });
        }
      }
    }
  }
}

async function SendStrikePush() {
  const now = moment().utc();
  // if now is 23:00 to 23:59, and i reached the goals for today, send a notification to the user
  if (now.hour() === 23 && now.minute() >= 0) {
    const users = await User.find({
      pushToken: { $exists: true, $ne: null },
    });
    for (let user of users) {
      const startOfWindow = moment().utc().startOf("day").hour(16).toDate();
      const now = moment().utc().toDate();
      const existingReminder = await Reminder.findOne({
        userId: user._id,
        reminderTime: {
          $gte: startOfWindow,
          $lte: now,
        },
        mealType: "daily-goal",
      });

      if (existingReminder) {
        continue;
      }

      const remainingNutrition = await getUserRemainingMacros(user._id);
      if (
        (remainingNutrition.calories <= 0 &&
          remainingNutrition.protein <= 0 &&
          remainingNutrition.carbs <= 0 &&
          remainingNutrition.fat <= 0) ||
        true
      ) {
        if (user.pushToken) {
          await sendPushNotification(
            user.pushToken,
            "Congratulations! You have reached your nutrition goals for today. Keep up the great work!🥳"
          );
          await Reminder.create({
            userId: user._id,
            notificationMessage:
              "Congratulations! You have reached your nutrition goals for today. Keep up the great work!🥳",
            reminderTime: moment().toDate(),
            mealType: "daily-goal",
            notificationSent: true,
          });
        }
      }
    }
  }
}

export const reminderNotificationScheduler = () => {
  setInterval(async () => {
    try {
      await sendPendingNotifications();
      await RecommendFoodThenPush();
      await SendStrikePush();
    } catch (error) {
      console.error("Error checking for reminders:", error);
    }
  }, 15000);
};
