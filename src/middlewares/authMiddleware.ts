import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    // Check if token exists
    if (!token) {
      res.status(401).json({ message: "Access denied" });
      return;
    }

    // Verify the token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || ""
    ) as JwtPayload;

    // Attach the decoded user data to the request object
    (req as any).user = decoded;

    // Proceed to the next middleware or route
    next();
  } catch (err) {
    // Handle invalid or expired token
    res.status(403).json({ message: "Invalid token" });
    return;
  }
};