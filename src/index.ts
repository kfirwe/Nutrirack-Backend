import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import session from "express-session";

import { errorHandler } from "./middlewares/errorHandler";
import scanRoutes from "./routes/scan.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";

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

// Mount food scanning routes under /scan
app.use("/scan", scanRoutes);

// Mount auth routes under /auth
app.use("/auth", authRoutes);

// Mount user routes under /user
app.use("/user", userRoutes);

// Error handling middleware (should come after all routes)
app.use(errorHandler);

mongoose.set("strictQuery", true);

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
