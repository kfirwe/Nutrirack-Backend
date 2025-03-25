import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User.model";

/**
 * ✅ Register User
 */
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    // 🔍 Check if the user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      res.status(400).json({ error: "User already exists with this email." });
      return;
    }

    // 🔒 Hash the password for new users
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🆕 Create a new user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error("❌ Error in registerUser:", error);
    next(error);
  }
};

/**
 * ✅ Login User
 */
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }
    // Generate token
    const token = jwt.sign(
      { id: (user._id as string).toString() },
      process.env.JWT_SECRET || "",
      {
        expiresIn: "1h",
      }
    );

    // get user last login
    const lastLogin = user.lastLogin;

    res.status(200).json({ message: "Login successful", token, lastLogin });
  } catch (error) {
    next(error);
  }
};

/**
 * ✅ Refresh Token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ message: "Refresh token is required" });
      return;
    }

    const secret = process.env.JWT_SECRET || "";
    let decodedToken: JwtPayload;

    try {
      decodedToken = jwt.verify(token, secret) as JwtPayload;
    } catch (error) {
      res.status(403).json({ message: "Invalid or expired refresh token" });
      return;
    }

    const newToken = jwt.sign({ id: decodedToken.id }, secret, {
      expiresIn: "1h",
    });

    res
      .status(200)
      .json({ message: "Token refreshed successfully", token: newToken });
  } catch (error) {
    next(error);
  }
};
