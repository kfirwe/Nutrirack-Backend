import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import session from "express-session";
import moment from "moment";
import { sendPushNotification } from "./services/push.service";
import User from "./models/User.model";
import Reminder from "./models/Reminder.model";

import { errorHandler } from "./middlewares/errorHandler";
import scanRoutes from "./routes/scan.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import chatRoutes from "./routes/chat.routes";
import historyRoutes from "./routes/history.routes";

dotenv.config();

const app: Application = express();
const PORT = parseInt(process.env.PORT as string, 10) || 3000;
const HOST = process.env.HOST || "localhost";

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.JWT_SECRET as string,
    resave: false,
    saveUninitialized: true,
  })
);

app.use("/scan", scanRoutes);
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/chat", chatRoutes);
app.use("/history", historyRoutes);
app.use(errorHandler);

mongoose.set("strictQuery", true);

if (require.main === module) {
  setInterval(async () => {
    try {
      const currentTime = moment().utc(); // Get current time in UTC
      console.log("Current time:", currentTime.format());
      // Find reminders that should be triggered
      const reminders = await Reminder.find({
        reminderTime: { $lte: currentTime.toDate() }, // Find reminders whose time is less than or equal to current time
        notificationSent: false, // Make sure we don't send the same notification again
      });

      // Process each reminder
      for (let reminder of reminders) {
        const { userId, notificationMessage } = reminder;

        // Find user push token
        const user = await User.findById(userId);
        if (user && user.pushToken) {
          // Send notification if user has a push token
          await sendPushNotification(user.pushToken, notificationMessage);

          // Mark reminder as sent
          await Reminder.findByIdAndUpdate(reminder._id, {
            notificationSent: true,
          });
          console.log(
            `Notification sent to user ${userId} for reminder: ${notificationMessage}`
          );
        }
      }
    } catch (error) {
      console.error("Error checking for reminders:", error);
    }
  }, 15000); // Run every 15 seconds
  mongoose
    .connect(process.env.MONGO_URI || "")
    .then(() => {
      console.log("Connected to MongoDB");
      app.listen(PORT, HOST, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Error connecting to MongoDB", err);
    });
}

export default app;
