import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authMiddleware.ts";
import pool from "../db/dbPool.ts";
import type { RowDataPacket } from "mysql2";

/**
 * Middleware that requires the user to be a platform manager
 * Must be used after authMiddleware
 */
export async function requirePlatformManager(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = parseInt(authReq.userId, 10);

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT user_id FROM platform_manager WHERE user_id = ?",
      [userId]
    );

    if (rows.length === 0) {
      res.status(403).json({
        success: false,
        message: "Platform manager access required",
      });
      return;
    }

    next();
  } catch (error) {
    console.error("Platform manager middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
