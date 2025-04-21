import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import User from "../models/User.model";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ message: "Access denied: No token provided" });
      return;
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "") as JwtPayload;
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: "Access token expired" });
        return;
      }

      res.status(StatusCodes.FORBIDDEN).json({ message: "Invalid token" });
      return;
    }

    const userId = decoded.id;
    if (!userId) {
      res.status(StatusCodes.FORBIDDEN).json({ message: "Invalid token payload" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
      return;
    }

    req.user = { id: user._id.toString() };
    next();
  } catch {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Server error during authentication" });
  }
};
