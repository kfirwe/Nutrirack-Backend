import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User.model"; // Import User model

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Get token from headers
    if (!token) {
      res.status(401).json({ message: "Access denied" });
      return;
    }

    // Decode token to get user ID
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || ""
    ) as JwtPayload;
    const userId = decoded.id; // Extract user ID from payload

    if (!userId) {
      res.status(403).json({ message: "Invalid token payload" });
      return;
    }

    // Find user in database to confirm existence
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Attach the user ID to the request object
    req.user = { id: (user._id as string).toString() }; // Ensure it's a string

    next(); // Move to the next middleware/controller
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
    return;
  }
};
