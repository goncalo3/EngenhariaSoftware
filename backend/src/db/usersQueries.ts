import pool from "./dbPool.ts";
import type { User, UserPublic } from "../types/user.ts";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

interface UserRow extends RowDataPacket, User {}

interface UserPublicRow extends RowDataPacket, UserPublic {}

/**
 * Create a new user
 * @param name - The user's name
 * @param email - The user's email
 * @param pwdHash - The hashed password
 * @returns The created user
 */
export async function createUser(
  name: string,
  email: string,
  pwdHash: string
): Promise<User> {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO users (name, email, pwd_hash) VALUES (?, ?, ?)",
    [name, email, pwdHash]
  );

  const user = await findUserById(result.insertId);
  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

/**
 * Find a user by their email address
 * @param email - The user's email
 * @returns The user if found, null otherwise
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT id, name, email, pwd_hash FROM users WHERE email = ?",
    [email]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Find a user by their ID
 * @param id - The user's ID
 * @returns The user if found, null otherwise
 */
export async function findUserById(id: number): Promise<User | null> {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT id, name, email, pwd_hash FROM users WHERE id = ?",
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Get all users (public info only)
 * @returns Array of all users with public info
 */
export async function getAllUsers(): Promise<UserPublic[]> {
  const [rows] = await pool.query<UserPublicRow[]>(
    "SELECT id, name, email FROM users ORDER BY name ASC"
  );

  return rows;
}

/**
 * Get all users in a team with their roles (public info only)
 * @param teamId - The team's ID
 * @returns Array of users with their team role
 */
export async function getUsersInTeam(teamId: number): Promise<(UserPublic & { role: string })[]> {
  const [rows] = await pool.query<(UserPublicRow & { role: string })[]>(
    `SELECT u.id, u.name, u.email, tu.role 
     FROM users u 
     INNER JOIN team_user tu ON u.id = tu.user_id 
     WHERE tu.team_id = ? 
     ORDER BY u.name ASC`,
    [teamId]
  );

  return rows;
}

/**
 * Update a user
 * @param id - The user's ID
 * @param data - Object containing fields to update (name, email, pwd_hash)
 * @returns true if updated, false if user not found
 */
export async function updateUser(
  id: number,
  data: { name?: string; email?: string; pwd_hash?: string }
): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (data.name) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.email) {
    fields.push("email = ?");
    values.push(data.email);
  }
  if (data.pwd_hash) {
    fields.push("pwd_hash = ?");
    values.push(data.pwd_hash);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}

/**
 * Delete a user
 * @param id - The user's ID
 * @returns true if deleted, false if user not found
 */
export async function deleteUser(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM users WHERE id = ?",
    [id]
  );

  return result.affectedRows > 0;
}
