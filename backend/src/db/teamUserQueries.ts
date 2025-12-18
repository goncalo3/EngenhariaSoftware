import pool from "./dbPool.ts";
import type { TeamUser, TeamRole } from "../types/teamUser.ts";
import type { Team } from "../types/team.ts";
import type { RowDataPacket } from "mysql2";

interface TeamUserRow extends RowDataPacket, TeamUser {}

interface TeamWithRoleRow extends RowDataPacket, Team {
  role: TeamRole;
}

/**
 * Get a user's membership in a specific team
 * @param userId - The user's ID
 * @param teamId - The team's ID
 * @returns The team membership if found, null otherwise
 */
export async function getTeamMembership(
  userId: number,
  teamId: number
): Promise<TeamUser | null> {
  const [rows] = await pool.query<TeamUserRow[]>(
    "SELECT id, user_id, team_id, role FROM team_user WHERE user_id = ? AND team_id = ?",
    [userId, teamId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Get a user's role in a specific team
 * @param userId - The user's ID
 * @param teamId - The team's ID
 * @returns The user's role in the team, null if not a member
 */
export async function getUserRoleInTeam(
  userId: number,
  teamId: number
): Promise<TeamRole | null> {
  const membership = await getTeamMembership(userId, teamId);
  return membership?.role ?? null;
}

/**
 * Get all team memberships for a user
 * @param userId - The user's ID
 * @returns Array of team memberships
 */
export async function getUserTeamMemberships(userId: number): Promise<TeamUser[]> {
  const [rows] = await pool.query<TeamUserRow[]>(
    "SELECT id, user_id, team_id, role FROM team_user WHERE user_id = ?",
    [userId]
  );

  return rows;
}

/**
 * Get all members of a team
 * @param teamId - The team's ID
 * @returns Array of team memberships
 */
export async function getTeamMembers(teamId: number): Promise<TeamUser[]> {
  const [rows] = await pool.query<TeamUserRow[]>(
    "SELECT id, user_id, team_id, role FROM team_user WHERE team_id = ?",
    [teamId]
  );

  return rows;
}

/**
 * Check if a user is a member of a team
 * @param userId - The user's ID
 * @param teamId - The team's ID
 * @returns true if the user is a member, false otherwise
 */
export async function isTeamMember(userId: number, teamId: number): Promise<boolean> {
  const membership = await getTeamMembership(userId, teamId);
  return membership !== null;
}

/**
 * Get all teams a user is in with their role
 * @param userId - The user's ID
 * @returns Array of teams with the user's role in each
 */
export async function getUserTeams(userId: number): Promise<(Team & { role: TeamRole })[]> {
  const [rows] = await pool.query<TeamWithRoleRow[]>(
    `SELECT t.id, t.name, tu.role 
     FROM team t 
     INNER JOIN team_user tu ON t.id = tu.team_id 
     WHERE tu.user_id = ? 
     ORDER BY t.name ASC`,
    [userId]
  );

  return rows;
}
