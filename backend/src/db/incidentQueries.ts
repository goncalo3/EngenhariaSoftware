import pool from "./dbPool.ts";
import type { Incident, IncidentStatus } from "../types/incident.ts";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

interface IncidentRow extends RowDataPacket, Incident {}

/**
 * Create a new incident
 */
export async function createIncident(
  title: string,
  description: string | null,
  teamId: number,
  reportedByUserId: number
): Promise<Incident> {
  const [result] = await pool.query<ResultSetHeader>(
    "INSERT INTO incident (title, description, team_id, reported_by_user_id) VALUES (?, ?, ?, ?)",
    [title, description, teamId, reportedByUserId]
  );

  const incident = await findIncidentById(result.insertId);
  if (!incident) {
    throw new Error("Failed to create incident");
  }

  return incident;
}

/**
 * Find an incident by ID
 */
export async function findIncidentById(id: number): Promise<Incident | null> {
  const [rows] = await pool.query<IncidentRow[]>(
    "SELECT id, title, description, status, team_id, reported_by_user_id, assigned_to_user_id FROM incident WHERE id = ?",
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

/**
 * Get all incidents for a team
 */
export async function getTeamIncidents(teamId: number): Promise<Incident[]> {
  const [rows] = await pool.query<IncidentRow[]>(
    "SELECT id, title, description, status, team_id, reported_by_user_id, assigned_to_user_id FROM incident WHERE team_id = ? ORDER BY id DESC",
    [teamId]
  );

  return rows;
}

/**
 * Update incident title
 */
export async function updateIncidentTitle(
  id: number,
  title: string
): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE incident SET title = ? WHERE id = ?",
    [title, id]
  );

  return result.affectedRows > 0;
}

/**
 * Update incident description
 */
export async function updateIncidentDescription(
  id: number,
  description: string | null
): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE incident SET description = ? WHERE id = ?",
    [description, id]
  );

  return result.affectedRows > 0;
}

/**
 * Update incident status
 */
export async function updateIncidentStatus(
  id: number,
  status: IncidentStatus
): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE incident SET status = ? WHERE id = ?",
    [status, id]
  );

  return result.affectedRows > 0;
}

/**
 * Assign incident to a user
 */
export async function assignIncident(
  id: number,
  assignedToUserId: number | null
): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE incident SET assigned_to_user_id = ? WHERE id = ?",
    [assignedToUserId, id]
  );

  return result.affectedRows > 0;
}

/**
 * Delete an incident
 */
export async function deleteIncident(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    "DELETE FROM incident WHERE id = ?",
    [id]
  );

  return result.affectedRows > 0;
}

/**
 * Get incidents created by a user that are not resolved
 */
export async function getIncidentsCreatedByUser(userId: number): Promise<Incident[]> {
  const [rows] = await pool.query<IncidentRow[]>(
    `SELECT id, title, description, status, team_id, reported_by_user_id, assigned_to_user_id 
     FROM incident 
     WHERE reported_by_user_id = ? AND status != 'resolved' 
     ORDER BY id DESC`,
    [userId]
  );

  return rows;
}

/**
 * Get incidents assigned to a user that are not resolved
 */
export async function getIncidentsAssignedToUser(userId: number): Promise<Incident[]> {
  const [rows] = await pool.query<IncidentRow[]>(
    `SELECT id, title, description, status, team_id, reported_by_user_id, assigned_to_user_id 
     FROM incident 
     WHERE assigned_to_user_id = ? AND status != 'resolved' 
     ORDER BY id DESC`,
    [userId]
  );

  return rows;
}

interface TeamIncidentStats {
  team_id: number;
  team_name: string;
  pending: number;
  under_review: number;
  escalated: number;
  resolved: number;
}

interface TeamIncidentStatsRow extends RowDataPacket, TeamIncidentStats {}

/**
 * Get incident stats per team for a user's teams
 */
export async function getTeamIncidentStats(userId: number): Promise<TeamIncidentStats[]> {
  const [rows] = await pool.query<TeamIncidentStatsRow[]>(
    `SELECT 
       t.id as team_id,
       t.name as team_name,
       SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) as pending,
       SUM(CASE WHEN i.status = 'under_review' THEN 1 ELSE 0 END) as under_review,
       SUM(CASE WHEN i.status = 'escalated' THEN 1 ELSE 0 END) as escalated,
       SUM(CASE WHEN i.status = 'resolved' THEN 1 ELSE 0 END) as resolved
     FROM team t
     INNER JOIN team_user tu ON t.id = tu.team_id
     LEFT JOIN incident i ON t.id = i.team_id
     WHERE tu.user_id = ?
     GROUP BY t.id, t.name
     ORDER BY t.name`,
    [userId]
  );

  return rows;
}
