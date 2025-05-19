import { sendMail } from "./mail.service";
import { getUsersWhoMetTodayCalories, getUsersBelowCalorieThreshold } from "./user.service";
import cron from 'node-cron';

const alertTodaySuperChamps = async () => {
  const calorieChamps = await getUsersWhoMetTodayCalories();
  calorieChamps.forEach(calorieChamp => {
    sendMail(calorieChamp.email,"goal reched", `hi ${calorieChamp.name} you reached you goal today!!`);
  });
}

const alertUsersInsertFoodMeals = async () => {
  const calorieChamps = await getUsersBelowCalorieThreshold(65, new Date());
  calorieChamps.forEach(calorieChamp => {
    sendMail(calorieChamp.email,"goal reched", `hi ${calorieChamp.name} you reached you goal today!!`);
  });
}

// → fires every day at 23:50 (11:50 PM)
cron.schedule('50 23 * * *', alertTodaySuperChamps, {
  timezone: 'Etc/UTC'
});


cron.schedule('50 23 * * *', alertTodaySuperChamps, {
  timezone: 'Etc/UTC'
});