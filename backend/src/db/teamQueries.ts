import pool from "./dbPool.ts";
import type { Team } from "../types/team.ts";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

interface TeamRow extends RowDataPacket, Team {}

/**
 * Create a new team
 */
export async function createTeam(name: string): Promise<Team> {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO team (name) VALUES (?)",
    [name]
  );

  return {
    id: result.insertId,
    name,
  };
}

/**
 * Get a team by ID
 */
export async function getTeamById(teamId: number): Promise<Team | null> {
  const [rows] = await pool.query<TeamRow[]>(
    "SELECT id, name FROM team WHERE id = ?",
    [teamId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Get all teams
 */
export async function getAllTeams(): Promise<Team[]> {
  const [rows] = await pool.query<TeamRow[]>(
    "SELECT id, name FROM team ORDER BY name ASC"
  );
  return rows;
}

/**
 * Update a team's name
 */
export async function updateTeam(teamId: number, name: string): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE team SET name = ? WHERE id = ?",
    [name, teamId]
  );
  return result.affectedRows > 0;
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM team WHERE id = ?",
    [teamId]
  );
  return result.affectedRows > 0;
}

/**
 * Add a user to a team
 */
export async function addUserToTeam(
  userId: number, 
  teamId: number, 
  role: 'user' | 'manager' | 'admin' = 'user'
): Promise<void> {
  await pool.query(
    "INSERT INTO team_user (user_id, team_id, role) VALUES (?, ?, ?)",
    [userId, teamId, role]
  );
}

/**
 * Remove a user from a team
 */
export async function removeUserFromTeam(userId: number, teamId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM team_user WHERE user_id = ? AND team_id = ?",
    [userId, teamId]
  );
  return result.affectedRows > 0;
}

/**
 * Update a user's role in a team
 */
export async function updateUserRoleInTeam(
  userId: number, 
  teamId: number, 
  role: 'user' | 'manager' | 'admin'
): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE team_user SET role = ? WHERE user_id = ? AND team_id = ?",
    [role, userId, teamId]
  );
  return result.affectedRows > 0;
}

/**
 * Check if a user is in a team
 */
export async function isUserInTeam(userId: number, teamId: number): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM team_user WHERE user_id = ? AND team_id = ?",
    [userId, teamId]
  );
  return rows.length > 0;
}
