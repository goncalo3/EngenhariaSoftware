import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../auth/authMiddleware.ts";
import { requireTeamMembership } from "../auth/authorization.ts";
import { getAllUsers } from "../db/usersQueries.ts";
import pool from "../db/dbPool.ts";
import type { RowDataPacket } from "mysql2";

const usersRouter = Router();

interface TeamWithRoleRow extends RowDataPacket {
  id: number;
  name: string;
  role: string;
}

interface UserWithRoleRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  role: string;
}

/**
 * GET /users
 * Get all users globally (authenticated users only)
 */
usersRouter.get(
  "/users",
  authMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await getAllUsers();

      res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET /users/teams
 * Get teams for a user. If ?userId is specified and user has permission, get that user's teams.
 * Otherwise, get the current authenticated user's teams.
 */
usersRouter.get(
  "/users/teams",
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUserId = parseInt(authReq.userId, 10);
      
      // Check if a specific userId was requested
      const requestedUserId = req.query.userId 
        ? parseInt(req.query.userId as string, 10) 
        : currentUserId;

      // For now, users can only see their own teams
      if (requestedUserId !== currentUserId) {
        res.status(403).json({
          success: false,
          message: "You can only view your own teams",
        });
        return;
      }

      // First check if team_user table has role column
      const [columns] = await pool.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_user' AND COLUMN_NAME = 'role'`
      );
      
      const hasRoleColumn = columns.length > 0;

      let teams;
      if (hasRoleColumn) {
        [teams] = await pool.query<TeamWithRoleRow[]>(
          `SELECT t.id, t.name, tu.role 
           FROM team t 
           INNER JOIN team_user tu ON t.id = tu.team_id 
           WHERE tu.user_id = ? 
           ORDER BY t.name ASC`,
          [requestedUserId]
        );
      } else {
        // Fallback: return teams without role
        const [teamsWithoutRole] = await pool.query<RowDataPacket[]>(
          `SELECT t.id, t.name, 'user' as role
           FROM team t 
           INNER JOIN team_user tu ON t.id = tu.team_id 
           WHERE tu.user_id = ? 
           ORDER BY t.name ASC`,
          [requestedUserId]
        );
        teams = teamsWithoutRole;
      }

      res.status(200).json({
        success: true,
        teams,
      });
    } catch (error) {
      console.error("Get user teams error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

/**
 * GET /teams/:teamId/users
 * Get all users in a team (team members only)
 */
usersRouter.get(
  "/teams/:teamId/users",
  authMiddleware,
  requireTeamMembership(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = parseInt(req.params.teamId, 10);

      // Get users with their roles in this team
      const [users] = await pool.query<UserWithRoleRow[]>(
        `SELECT u.id, u.name, u.email, tu.role
         FROM users u
         INNER JOIN team_user tu ON u.id = tu.user_id
         WHERE tu.team_id = ?
         ORDER BY u.name ASC`,
        [teamId]
      );

      res.status(200).json({
        success: true,
        users,
      });
    } catch (error) {
      console.error("Get team users error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

export default usersRouter;
