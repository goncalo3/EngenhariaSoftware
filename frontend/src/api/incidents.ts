const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost/api";

export type IncidentStatus = "pending" | "under_review" | "escalated" | "resolved";

export interface Incident {
  id: number;
  title: string;
  description: string | null;
  status: IncidentStatus;
  team_id: number;
  reported_by_user_id: number;
  assigned_to_user_id: number | null;
}

export interface CreateIncidentData {
  title: string;
  description?: string;
}

export interface UpdateIncidentData {
  title?: string;
  description?: string;
  status?: IncidentStatus;
  assigned_to_user_id?: number | null;
}

/**
 * Get all incidents for a team
 */
export async function getTeamIncidents(teamId: number): Promise<Incident[]> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/incidents`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch incidents");
  }

  return data.incidents;
}

/**
 * Get a single incident
 */
export async function getIncident(teamId: number, incidentId: number): Promise<Incident> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/incidents/${incidentId}`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch incident");
  }

  return data.incident;
}

/**
 * Create a new incident
 */
export async function createIncident(teamId: number, incidentData: CreateIncidentData): Promise<Incident> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/incidents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(incidentData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create incident");
  }

  return data.incident;
}

/**
 * Update an incident
 */
export async function updateIncident(
  teamId: number,
  incidentId: number,
  updates: UpdateIncidentData
): Promise<Incident> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/incidents/${incidentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update incident");
  }

  return data.incident;
}
