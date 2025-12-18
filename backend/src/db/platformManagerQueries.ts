import pool from "./dbPool.ts";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * Check if a user is a platform manager
 */
export async function isPlatformManager(userId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT user_id FROM platform_manager WHERE user_id = ?",
    [userId]
  );
  return rows.length > 0;
}

/**
 * Add a user as a platform manager
 */
export async function addPlatformManager(userId: number): Promise<void> {
  await pool.query(
    "INSERT INTO platform_manager (user_id) VALUES (?)",
    [userId]
  );
}

/**
 * Remove a user from platform managers
 */
export async function removePlatformManager(userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM platform_manager WHERE user_id = ?",
    [userId]
  );
  return result.affectedRows > 0;
}

/**
 * Get all platform managers with user info
 */
export async function getAllPlatformManagers(): Promise<{ user_id: number; name: string; email: string }[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT pm.user_id, u.name, u.email 
     FROM platform_manager pm 
     INNER JOIN users u ON pm.user_id = u.id 
     ORDER BY u.name ASC`
  );
  return rows as { user_id: number; name: string; email: string }[];
}
