import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../auth/authMiddleware.ts";
import { requireTeamMembership, requireTeamRole, hasIncidentPermission, canEditOwnIncident, IncidentPermission } from "../auth/authorization.ts";
import { TeamRole } from "../types/teamUser.ts";
import { IncidentStatus } from "../types/incident.ts";
import { getUserRoleInTeam } from "../db/teamUserQueries.ts";
import {
  createIncident,
  findIncidentById,
  getTeamIncidents,
  updateIncidentTitle,
  updateIncidentDescription,
  updateIncidentStatus,
  assignIncident,
} from "../db/incidentQueries.ts";

const incidentRouter = Router();

interface CreateIncidentBody {
  title: string;
  description?: string;
}

interface UpdateIncidentBody {
  title?: string;
  description?: string;
  status?: IncidentStatus;
  assigned_to_user_id?: number | null;
}

/**
 * POST /teams/:teamId/incidents
 * Create a new incident (any team member)
 */
incidentRouter.post(
  "/teams/:teamId/incidents",
  authMiddleware,
  requireTeamMembership(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const teamId = parseInt(req.params.teamId, 10);
      const { title, description } = req.body as CreateIncidentBody;

      if (!title || title.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Title is required",
        });
        return;
      }

      const incident = await createIncident(
        title.trim(),
        description?.trim() || null,
        teamId,
        parseInt(authReq.userId, 10)
      );

      res.status(201).json({
        success: true,
        message: "Incident created successfully",
        incident,
      });
    } catch (error) {
      console.error("Create incident error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET /teams/:teamId/incidents
 * List all incidents for a team (any team member)
 */
incidentRouter.get(
  "/teams/:teamId/incidents",
  authMiddleware,
  requireTeamMembership(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = parseInt(req.params.teamId, 10);
      const incidents = await getTeamIncidents(teamId);

      res.status(200).json({
        success: true,
        incidents,
      });
    } catch (error) {
      console.error("List incidents error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET /teams/:teamId/incidents/:incidentId
 * Get a specific incident (any team member)
 */
incidentRouter.get(
  "/teams/:teamId/incidents/:incidentId",
  authMiddleware,
  requireTeamMembership(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = parseInt(req.params.teamId, 10);
      const incidentId = parseInt(req.params.incidentId, 10);

      const incident = await findIncidentById(incidentId);

      if (!incident || incident.team_id !== teamId) {
        res.status(404).json({
          success: false,
          message: "Incident not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        incident,
      });
    } catch (error) {
      console.error("Get incident error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * PATCH /teams/:teamId/incidents/:incidentId
 * Update an incident (role-based permissions)
 * 
 * Permissions:
 * - title: reporter (owner) OR manager/admin
 * - status: assigned user OR manager/admin
 * - assigned_to_user_id: manager/admin only
 */
incidentRouter.patch(
  "/teams/:teamId/incidents/:incidentId",
  authMiddleware,
  requireTeamMembership(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const teamId = parseInt(req.params.teamId, 10);
      const incidentId = parseInt(req.params.incidentId, 10);
      const userId = parseInt(authReq.userId, 10);
      const updates = req.body as UpdateIncidentBody;

      // Get the incident
      const incident = await findIncidentById(incidentId);

      if (!incident || incident.team_id !== teamId) {
        res.status(404).json({
          success: false,
          message: "Incident not found",
        });
        return;
      }

      // Get user's role in the team
      const userRole = await getUserRoleInTeam(userId, teamId);

      if (!userRole) {
        res.status(403).json({
          success: false,
          message: "You are not a member of this team",
        });
        return;
      }

      const errors: string[] = [];
      let updated = false;

      // Handle title update
      if (updates.title !== undefined) {
        const canEditTitle =
          canEditOwnIncident(incident, userId) ||
          hasIncidentPermission(userRole, IncidentPermission.ASSIGN); // managers/admins

        if (!canEditTitle) {
          errors.push("You do not have permission to edit the title");
        } else if (updates.title.trim() === "") {
          errors.push("Title cannot be empty");
        } else {
          await updateIncidentTitle(incidentId, updates.title.trim());
          updated = true;
        }
      }

      // Handle description update
      if (updates.description !== undefined) {
        const canEditDescription =
          canEditOwnIncident(incident, userId) ||
          hasIncidentPermission(userRole, IncidentPermission.ASSIGN); // managers/admins

        if (!canEditDescription) {
          errors.push("You do not have permission to edit the description");
        } else {
          await updateIncidentDescription(incidentId, updates.description.trim() || null);
          updated = true;
        }
      }

      // Handle status update
      if (updates.status !== undefined) {
        const validStatuses = Object.values(IncidentStatus);
        if (!validStatuses.includes(updates.status)) {
          errors.push(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        } else {
          const canEditStatus = hasIncidentPermission(
            userRole,
            IncidentPermission.EDIT_STATUS,
            incident,
            userId
          );

          if (!canEditStatus) {
            errors.push("You do not have permission to edit the status");
          } else {
            await updateIncidentStatus(incidentId, updates.status);
            updated = true;
          }
        }
      }

      // Handle assignment update
      if (updates.assigned_to_user_id !== undefined) {
        const canAssign = hasIncidentPermission(userRole, IncidentPermission.ASSIGN);

        if (!canAssign) {
          errors.push("You do not have permission to assign incidents");
        } else {
          await assignIncident(incidentId, updates.assigned_to_user_id);
          updated = true;
        }
      }

      // Return errors if any occurred
      if (errors.length > 0 && !updated) {
        res.status(403).json({
          success: false,
          message: "Permission denied",
          errors,
        });
        return;
      }

      // Get updated incident
      const updatedIncident = await findIncidentById(incidentId);

      res.status(200).json({
        success: true,
        message: updated ? "Incident updated successfully" : "No changes made",
        incident: updatedIncident,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Update incident error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default incidentRouter;
