const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost/api";

export interface Team {
  id: number;
  name: string;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: "user" | "manager" | "admin";
}

export interface PlatformManager {
  user_id: number;
  name: string;
  email: string;
}

/**
 * Check if current user is a platform manager
 */
export async function checkPlatformManagerStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/status`, {
      credentials: "include",
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.isPlatformManager === true;
  } catch {
    return false;
  }
}

// ============ TEAM MANAGEMENT ============

/**
 * Get all teams (admin)
 */
export async function getAllTeams(): Promise<Team[]> {
  const response = await fetch(`${API_BASE_URL}/admin/teams`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch teams");
  return data.teams;
}

/**
 * Create a new team
 */
export async function createTeam(name: string): Promise<Team> {
  const response = await fetch(`${API_BASE_URL}/admin/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create team");
  return data.team;
}

/**
 * Update a team
 */
export async function updateTeam(teamId: number, name: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update team");
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to delete team");
}

// ============ TEAM MEMBERSHIP ============

/**
 * Get team members
 */
export async function getTeamMembers(teamId: number): Promise<TeamMember[]> {
  const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}/members`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch members");
  return data.members;
}

/**
 * Add user to team
 */
export async function addTeamMember(
  teamId: number,
  userId: number,
  role: "user" | "manager" | "admin" = "user"
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to add member");
}

/**
 * Update member role
 */
export async function updateMemberRole(
  teamId: number,
  userId: number,
  role: "user" | "manager" | "admin"
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}/members/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update role");
}

/**
 * Remove member from team
 */
export async function removeTeamMember(teamId: number, userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to remove member");
}

// ============ PLATFORM MANAGERS ============

/**
 * Get all platform managers
 */
export async function getPlatformManagers(): Promise<PlatformManager[]> {
  const response = await fetch(`${API_BASE_URL}/admin/managers`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch managers");
  return data.managers;
}

/**
 * Add platform manager
 */
export async function addPlatformManager(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/managers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to add manager");
}

/**
 * Remove platform manager
 */
export async function removePlatformManager(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/managers/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to remove manager");
}

// ============ USER MANAGEMENT ============

export interface AdminUser {
  id: number;
  name: string;
  email: string;
}

/**
 * Get all users (admin)
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch users");
  return data.users;
}

/**
 * Create a new user
 */
export async function createUser(name: string, email: string, password: string): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create user");
  return data.user;
}

/**
 * Update a user
 */
export async function updateUser(
  userId: number,
  updates: { name?: string; email?: string; password?: string }
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update user");
}

/**
 * Delete a user
 */
export async function deleteUser(userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to delete user");
}
