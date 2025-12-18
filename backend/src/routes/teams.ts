import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../auth/authMiddleware.ts";
import { requireTeamRole } from "../auth/authorization.ts";
import { TeamRole } from "../types/teamUser.ts";
import { addUserToTeam, removeUserFromTeam, updateUserRoleInTeam, isUserInTeam, getTeamById } from "../db/teamQueries.ts";
import { getUserRoleInTeam } from "../db/teamUserQueries.ts";
import { findUserById } from "../db/usersQueries.ts";
import pool from "../db/dbPool.ts";
import type { RowDataPacket } from "mysql2";

const teamsRouter = Router();

// All routes require authentication
teamsRouter.use(authMiddleware);

/**
 * GET /teams/:teamId/members
 * Get all members of a team (any team member can view)
 */
teamsRouter.get(
  "/:teamId/members",
  requireTeamRole(TeamRole.USER, TeamRole.MANAGER, TeamRole.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = parseInt(req.params.teamId, 10);

      const [members] = await pool.query<RowDataPacket[]>(
        `SELECT u.id, u.name, u.email, tu.role
         FROM users u
         INNER JOIN team_user tu ON u.id = tu.user_id
         WHERE tu.team_id = ?
         ORDER BY u.name ASC`,
        [teamId]
      );

      res.status(200).json({ success: true, members });
    } catch (error) {
      console.error("Get team members error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * POST /teams/:teamId/members
 * Add a user to the team (admin only)
 */
teamsRouter.post(
  "/:teamId/members",
  requireTeamRole(TeamRole.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const teamId = parseInt(req.params.teamId, 10);
      const { userId, role = "user" } = req.body;

      if (!userId || isNaN(parseInt(userId, 10))) {
        res.status(400).json({ success: false, message: "Valid user ID is required" });
        return;
      }

      // Team admins can only add users and managers, not other admins
      const validRoles = ["user", "manager"];
      if (!validRoles.includes(role)) {
        res.status(400).json({ success: false, message: "Team admins can only add users or managers" });
        return;
      }

      // Check if user exists
      const user = await findUserById(parseInt(userId, 10));
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      // Check if already a member
      const alreadyMember = await isUserInTeam(parseInt(userId, 10), teamId);
      if (alreadyMember) {
        res.status(400).json({ success: false, message: "User is already a team member" });
        return;
      }

      await addUserToTeam(parseInt(userId, 10), teamId, role);
      res.status(201).json({ success: true, message: "User added to team" });
    } catch (error) {
      console.error("Add team member error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * PUT /teams/:teamId/members/:userId
 * Update a user's role in the team (admin only)
 */
teamsRouter.put(
  "/:teamId/members/:userId",
  requireTeamRole(TeamRole.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUserId = parseInt(authReq.userId, 10);
      const teamId = parseInt(req.params.teamId, 10);
      const targetUserId = parseInt(req.params.userId, 10);
      const { role } = req.body;

      if (isNaN(targetUserId)) {
        res.status(400).json({ success: false, message: "Invalid user ID" });
        return;
      }

      // Prevent changing your own role
      if (targetUserId === currentUserId) {
        res.status(400).json({ success: false, message: "Cannot change your own role" });
        return;
      }

      // Check the target user's current role
      const targetRole = await getUserRoleInTeam(targetUserId, teamId);
      if (!targetRole) {
        res.status(404).json({ success: false, message: "User is not a member of this team" });
        return;
      }

      // Team admins cannot change other admins' roles
      if (targetRole === TeamRole.ADMIN) {
        res.status(403).json({ success: false, message: "Cannot change another admin's role" });
        return;
      }

      // Team admins can only set roles to user or manager, not admin
      const validRoles = ["user", "manager"];
      if (!role || !validRoles.includes(role)) {
        res.status(400).json({ success: false, message: "Valid role is required (user or manager)" });
        return;
      }

      const updated = await updateUserRoleInTeam(targetUserId, teamId, role);
      if (!updated) {
        res.status(404).json({ success: false, message: "Team membership not found" });
        return;
      }

      res.status(200).json({ success: true, message: "Role updated" });
    } catch (error) {
      console.error("Update member role error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * DELETE /teams/:teamId/members/:userId
 * Remove a user from the team (admin only)
 */
teamsRouter.delete(
  "/:teamId/members/:userId",
  requireTeamRole(TeamRole.ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const currentUserId = parseInt(authReq.userId, 10);
      const teamId = parseInt(req.params.teamId, 10);
      const targetUserId = parseInt(req.params.userId, 10);

      if (isNaN(targetUserId)) {
        res.status(400).json({ success: false, message: "Invalid user ID" });
        return;
      }

      // Prevent removing yourself
      if (targetUserId === currentUserId) {
        res.status(400).json({ success: false, message: "Cannot remove yourself from the team" });
        return;
      }

      // Check the target user's current role
      const targetRole = await getUserRoleInTeam(targetUserId, teamId);
      if (!targetRole) {
        res.status(404).json({ success: false, message: "User is not a member of this team" });
        return;
      }

      // Team admins cannot remove other admins
      if (targetRole === TeamRole.ADMIN) {
        res.status(403).json({ success: false, message: "Cannot remove another admin from the team" });
        return;
      }

      const removed = await removeUserFromTeam(targetUserId, teamId);
      if (!removed) {
        res.status(404).json({ success: false, message: "Team membership not found" });
        return;
      }

      res.status(200).json({ success: true, message: "User removed from team" });
    } catch (error) {
      console.error("Remove team member error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

/**
 * GET /teams/:teamId/my-role
 * Get the current user's role in a team
 */
teamsRouter.get(
  "/:teamId/my-role",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = parseInt(authReq.userId, 10);
      const teamId = parseInt(req.params.teamId, 10);

      if (isNaN(teamId)) {
        res.status(400).json({ success: false, message: "Invalid team ID" });
        return;
      }

      const role = await getUserRoleInTeam(userId, teamId);

      if (!role) {
        res.status(404).json({ success: false, message: "Not a member of this team" });
        return;
      }

      res.status(200).json({ success: true, role });
    } catch (error) {
      console.error("Get my role error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
);

export default teamsRouter;
