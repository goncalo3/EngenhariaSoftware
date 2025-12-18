import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authMiddleware.ts";
import type { TeamRole } from "../types/teamUser.ts";
import type { Incident } from "../types/incident.ts";
import { TeamRole as Roles } from "../types/teamUser.ts";
import { getUserRoleInTeam } from "../db/teamUserQueries.ts";

/**
 * Permission types for incident operations
 */
export const IncidentPermission = {
  CREATE: "create",
  VIEW: "view",
  EDIT_STATUS: "edit_status",
  ASSIGN: "assign",
  DELETE: "delete",
} as const;

export type IncidentPermission = (typeof IncidentPermission)[keyof typeof IncidentPermission];

/**
 * Check if a team role has a specific permission for an incident
 * @param teamRole - The user's role in the team
 * @param permission - The permission to check
 * @param incident - The incident (optional, for context-based checks)
 * @param userId - The user's ID (optional, for ownership checks)
 */
export function hasIncidentPermission(
  teamRole: TeamRole,
  permission: IncidentPermission,
  incident?: Incident,
  userId?: number
): boolean {
  // Admins can do everything
  if (teamRole === Roles.ADMIN) {
    return true;
  }

  // Managers can do everything except delete
  if (teamRole === Roles.MANAGER) {
    return permission !== IncidentPermission.DELETE;
  }

  // Regular users
  switch (permission) {
    case IncidentPermission.CREATE:
      // Any team member can create incidents
      return true;

    case IncidentPermission.VIEW:
      // Any team member can view incidents
      return true;

    case IncidentPermission.EDIT_STATUS:
      // Users can only update status if they are assigned to the incident
      if (incident && userId) {
        return incident.assigned_to_user_id === userId;
      }
      return false;

    case IncidentPermission.ASSIGN:
      // Regular users cannot assign incidents
      return false;

    case IncidentPermission.DELETE:
      // Only admins can delete (handled above)
      return false;

    default:
      return false;
  }
}

/**
 * Check if a user can edit their own incident (title, description)
 */
export function canEditOwnIncident(incident: Incident, userId: number): boolean {
  return incident.reported_by_user_id === userId;
}

/**
 * Middleware factory to require a specific role in a team
 * Expects teamId to be in req.params.teamId or req.body.teamId
 * @param allowedRoles - Array of roles that are allowed
 */
export function requireTeamRole(...allowedRoles: TeamRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const teamId = parseInt(req.params.teamId || req.body.teamId, 10);

    if (!teamId || isNaN(teamId)) {
      res.status(400).json({
        success: false,
        message: "Team ID is required",
      });
      return;
    }

    const userRole = await getUserRoleInTeam(parseInt(authReq.userId, 10), teamId);

    if (!userRole) {
      res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions in this team",
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require team membership (any role)
 * Expects teamId to be in req.params.teamId or req.body.teamId
 */
export function requireTeamMembership() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const teamId = parseInt(req.params.teamId || req.body.teamId, 10);

    if (!teamId || isNaN(teamId)) {
      res.status(400).json({
        success: false,
        message: "Team ID is required",
      });
      return;
    }

    const userRole = await getUserRoleInTeam(parseInt(authReq.userId, 10), teamId);

    if (!userRole) {
      res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
      return;
    }

    next();
  };
}

export default {
  hasIncidentPermission,
  canEditOwnIncident,
  requireTeamRole,
  requireTeamMembership,
};
