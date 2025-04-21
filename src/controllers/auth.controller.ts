import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import {
  findUserByEmail,
  registerUser as registerUserService,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../services/auth.service";

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "User already exists with this email." });
      return;
    }

    const newUser = await registerUserService(name, email, password);

    res.status(StatusCodes.CREATED).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid credentials" });
      return;
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    res.status(StatusCodes.OK).json({
      message: "Login successful",
      accessToken,
      refreshToken,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Refresh token is required" });
      return;
    }

    let decodedToken;
    try {
      decodedToken = verifyRefreshToken(refreshToken);
    } catch {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ message: "Invalid or expired refresh token" });
      return;
    }

    const newAccessToken = generateAccessToken((decodedToken as any).id);

    res.status(StatusCodes.OK).json({
      message: "Access token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(error);
  }
};
