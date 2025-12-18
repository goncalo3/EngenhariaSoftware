import { Router } from "express";
import type { Request, Response } from "express";
import { findUserByEmail, createUser } from "../db/usersQueries.ts";
import { toUserPublic } from "../types/user.ts";
import makeJwtPayload from "../auth/makeJwtPayload.ts";

const authRouter = Router();

interface LoginRequestBody {
  email: string;
  password: string;
}

interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
}

/**
 * POST /auth/register
 * Creates a new user account
 */
authRouter.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as RegisterRequestBody;

    // Validate input
    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email already registered",
      });
      return;
    }

    // Hash password using Bun's built-in password hashing
    const pwdHash = await Bun.password.hash(password);

    // Create user
    const user = await createUser(name, email, pwdHash);

    // Generate JWT token
    const { token, expiresIn } = makeJwtPayload(user.id.toString());

    // Parse expiresIn to milliseconds for cookie maxAge
    const maxAge = parseExpiresIn(expiresIn);

    // Set JWT as httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: maxAge,
      path: "/",
    });

    // Return user data (without sensitive info)
    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: toUserPublic(user),
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /auth/login
 * Authenticates a user and sets JWT as httpOnly cookie
 */
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequestBody;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    // Find user by email
    const user = await findUserByEmail(email);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Verify password using Bun's built-in password hashing
    const isPasswordValid = await Bun.password.verify(password, user.pwd_hash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    // Generate JWT token
    const { token, expiresIn } = makeJwtPayload(user.id.toString());

    // Parse expiresIn to milliseconds for cookie maxAge
    const maxAge = parseExpiresIn(expiresIn);

    // Set JWT as httpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: maxAge,
      path: "/",
    });

    // Return user data (without sensitive info)
    res.status(200).json({
      success: true,
      message: "Login successful",
      user: toUserPublic(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /auth/logout
 * Clears the JWT cookie
 */
authRouter.post("/logout", (_req: Request, res: Response): void => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * Parses JWT expiresIn string to milliseconds
 * @param expiresIn - Time string like "1h", "7d", "30m"
 * @returns Time in milliseconds
 */
function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 3600000; // Default to 1 hour
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 3600000;
  }
}

export default authRouter;
