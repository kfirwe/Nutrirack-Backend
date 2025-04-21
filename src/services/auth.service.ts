import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../models/User.model";

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "1h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export const generateAccessToken = (id: string) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN });

export const generateRefreshToken = (id: string) =>
  jwt.sign({ id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, JWT_REFRESH_SECRET);

export const hashPassword = async (password: string) =>
  bcrypt.hash(password, 10);

export const comparePassword = async (input: string, hash: string) =>
  bcrypt.compare(input, hash);

export const findUserByEmail = async (email: string) =>
  User.findOne({ email });

export const registerUser = async (name: string, email: string, password: string) => {
  const hashed = await hashPassword(password);
  return await User.create({ name, email, password: hashed });
};
