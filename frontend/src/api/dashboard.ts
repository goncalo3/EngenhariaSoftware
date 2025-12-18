import type { Incident } from "./incidents";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost/api";

export interface TeamIncidentStats {
  team_id: number;
  team_name: string;
  pending: number;
  under_review: number;
  escalated: number;
  resolved: number;
}

/**
 * Get incidents created by the current user that are not resolved
 */
export async function getMyIncidents(): Promise<Incident[]> {
  const response = await fetch(`${API_BASE_URL}/dashboard/my-incidents`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch my incidents");
  }

  return data.incidents;
}

/**
 * Get incidents assigned to the current user that are not resolved
 */
export async function getAssignedIncidents(): Promise<Incident[]> {
  const response = await fetch(`${API_BASE_URL}/dashboard/assigned-incidents`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch assigned incidents");
  }

  return data.incidents;
}

/**
 * Get incident stats per team
 */
export async function getTeamIncidentStats(): Promise<TeamIncidentStats[]> {
  const response = await fetch(`${API_BASE_URL}/dashboard/team-stats`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch team stats");
  }

  return data.stats;
}
