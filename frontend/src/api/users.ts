const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost/api";

export interface UserPublic {
  id: number;
  name: string;
  email: string;
}

export interface UserWithRole extends UserPublic {
  role: string;
}

export interface Team {
  id: number;
  name: string;
  role: string;
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<UserPublic[]> {
  const response = await fetch(`${API_BASE_URL}/users`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch users");
  }

  return data.users;
}

/**
 * Get current user's teams (or another user's teams if userId provided)
 */
export async function getMyTeams(userId?: number): Promise<Team[]> {
  const url = userId 
    ? `${API_BASE_URL}/users/teams?userId=${userId}`
    : `${API_BASE_URL}/users/teams`;
    
  const response = await fetch(url, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch teams");
  }

  return data.teams;
}

/**
 * Get all users in a team
 */
export async function getTeamUsers(teamId: number): Promise<UserWithRole[]> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/users`, {
    credentials: "include",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch team users");
  }

  return data.users;
}
