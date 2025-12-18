export const TeamRole = {
  USER: "user",
  MANAGER: "manager",
  ADMIN: "admin",
} as const;

export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];

export interface TeamUser {
  id: number;
  user_id: number;
  team_id: number;
  role: TeamRole;
}
