const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost/api";

export type TeamRole = "user" | "manager" | "admin";

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: TeamRole;
}

/**
 * Get current user's role in a team
 */
export async function getMyRoleInTeam(teamId: number): Promise<TeamRole | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/teams/${teamId}/my-role`, {
      credentials: "include",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.role;
  } catch {
    return null;
  }
}

/**
 * Get team members
 */
export async function getTeamMembersAsAdmin(teamId: number): Promise<TeamMember[]> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch members");
  return data.members;
}

/**
 * Add user to team (team admin)
 */
export async function addUserToTeamAsAdmin(
  teamId: number,
  userId: number,
  role: "user" | "manager" = "user"
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to add member");
}

/**
 * Update member role (team admin)
 */
export async function updateMemberRoleAsAdmin(
  teamId: number,
  userId: number,
  role: "user" | "manager"
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update role");
}

/**
 * Remove member from team (team admin)
 */
export async function removeMemberAsAdmin(teamId: number, userId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to remove member");
}
