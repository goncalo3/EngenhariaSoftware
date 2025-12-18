export const IncidentStatus = {
  PENDING: "pending",
  UNDER_REVIEW: "under_review",
  ESCALATED: "escalated",
  RESOLVED: "resolved",
} as const;

export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export interface Incident {
  id: number;
  title: string;
  description: string | null;
  status: IncidentStatus;
  team_id: number;
  reported_by_user_id: number;
  assigned_to_user_id: number | null;
}
