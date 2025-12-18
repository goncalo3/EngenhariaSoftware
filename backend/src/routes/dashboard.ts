import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../auth/authMiddleware.ts";
import {
  getIncidentsCreatedByUser,
  getIncidentsAssignedToUser,
  getTeamIncidentStats,
} from "../db/incidentQueries.ts";

const dashboardRouter = Router();

/**
 * GET /dashboard/my-incidents
 * Get incidents created by the current user that are not resolved
 */
dashboardRouter.get(
  "/my-incidents",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = parseInt(authReq.userId, 10);

      const incidents = await getIncidentsCreatedByUser(userId);

      res.status(200).json({
        success: true,
        incidents,
      });
    } catch (error) {
      console.error("Get my incidents error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET /dashboard/assigned-incidents
 * Get incidents assigned to the current user that are not resolved
 */
dashboardRouter.get(
  "/assigned-incidents",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = parseInt(authReq.userId, 10);

      const incidents = await getIncidentsAssignedToUser(userId);

      res.status(200).json({
        success: true,
        incidents,
      });
    } catch (error) {
      console.error("Get assigned incidents error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET /dashboard/team-stats
 * Get incident stats per team for the current user's teams
 */
dashboardRouter.get(
  "/team-stats",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = parseInt(authReq.userId, 10);

      const stats = await getTeamIncidentStats(userId);

      res.status(200).json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("Get team stats error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default dashboardRouter;
