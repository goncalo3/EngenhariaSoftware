import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware } from "../auth/authMiddleware.ts";
import { requirePlatformManager } from "../auth/platformManagerMiddleware.ts";
import { isPlatformManager, getAllPlatformManagers, addPlatformManager, removePlatformManager } from "../db/platformManagerQueries.ts";
import { createTeam, getAllTeams, getTeamById, updateTeam, deleteTeam, addUserToTeam, removeUserFromTeam, updateUserRoleInTeam, isUserInTeam } from "../db/teamQueries.ts";
import { findUserById, findUserByEmail, getAllUsers, createUser, updateUser, deleteUser } from "../db/usersQueries.ts";
import type { AuthenticatedRequest } from "../auth/authMiddleware.ts";
import pool from "../db/dbPool.ts";
import type { RowDataPacket } from "mysql2";

const adminRouter = Router();

// All routes require authentication and platform manager status
adminRouter.use(authMiddleware);
adminRouter.use(requirePlatformManager);

/**
 * GET /admin/status
 * Check if current user is a platform manager
 */
adminRouter.get("/status", async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    isPlatformManager: true,
  });
});

// ============ TEAM MANAGEMENT ============

/**
 * GET /admin/teams
 * Get all teams
 */
adminRouter.get("/teams", async (_req: Request, res: Response): Promise<void> => {
  try {
    const teams = await getAllTeams();
    res.status(200).json({ success: true, teams });
  } catch (error) {
    console.error("Get all teams error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /admin/teams
 * Create a new team
 */
adminRouter.post("/teams", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ success: false, message: "Team name is required" });
      return;
    }

    const team = await createTeam(name.trim());
    res.status(201).json({ success: true, team });
  } catch (error) {
    console.error("Create team error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * PUT /admin/teams/:teamId
 * Update a team
 */
adminRouter.put("/teams/:teamId", async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const { name } = req.body;

    if (isNaN(teamId)) {
      res.status(400).json({ success: false, message: "Invalid team ID" });
      return;
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ success: false, message: "Team name is required" });
      return;
    }

    const updated = await updateTeam(teamId, name.trim());
    if (!updated) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Team updated" });
  } catch (error) {
    console.error("Update team error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * DELETE /admin/teams/:teamId
 * Delete a team
 */
adminRouter.delete("/teams/:teamId", async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);

    if (isNaN(teamId)) {
      res.status(400).json({ success: false, message: "Invalid team ID" });
      return;
    }

    const deleted = await deleteTeam(teamId);
    if (!deleted) {
      res.status(404).json({ success: false, message: "Team not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Team deleted" });
  } catch (error: any) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      res.status(400).json({ success: false, message: "Cannot delete team with members or incidents" });
      return;
    }
    console.error("Delete team error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============ TEAM MEMBERSHIP MANAGEMENT ============

/**
 * GET /admin/teams/:teamId/members
 * Get all members of a team
 */
adminRouter.get("/teams/:teamId/members", async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);

    if (isNaN(teamId)) {
      res.status(400).json({ success: false, message: "Invalid team ID" });
      return;
    }

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
});

/**
 * POST /admin/teams/:teamId/members
 * Add a user to a team
 */
adminRouter.post("/teams/:teamId/members", async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const { userId, role = "user" } = req.body;

    if (isNaN(teamId)) {
      res.status(400).json({ success: false, message: "Invalid team ID" });
      return;
    }

    if (!userId || isNaN(parseInt(userId, 10))) {
      res.status(400).json({ success: false, message: "Valid user ID is required" });
      return;
    }

    const validRoles = ["user", "manager", "admin"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role" });
      return;
    }

    // Check if team exists
    const team = await getTeamById(teamId);
    if (!team) {
      res.status(404).json({ success: false, message: "Team not found" });
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
});

/**
 * PUT /admin/teams/:teamId/members/:userId
 * Update a user's role in a team
 */
adminRouter.put("/teams/:teamId/members/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const userId = parseInt(req.params.userId, 10);
    const { role } = req.body;

    if (isNaN(teamId) || isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid team or user ID" });
      return;
    }

    const validRoles = ["user", "manager", "admin"];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ success: false, message: "Valid role is required (user, manager, admin)" });
      return;
    }

    const updated = await updateUserRoleInTeam(userId, teamId, role);
    if (!updated) {
      res.status(404).json({ success: false, message: "Team membership not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Role updated" });
  } catch (error) {
    console.error("Update member role error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * DELETE /admin/teams/:teamId/members/:userId
 * Remove a user from a team
 */
adminRouter.delete("/teams/:teamId/members/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(teamId) || isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid team or user ID" });
      return;
    }

    const removed = await removeUserFromTeam(userId, teamId);
    if (!removed) {
      res.status(404).json({ success: false, message: "Team membership not found" });
      return;
    }

    res.status(200).json({ success: true, message: "User removed from team" });
  } catch (error) {
    console.error("Remove team member error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============ PLATFORM MANAGER MANAGEMENT ============

/**
 * GET /admin/managers
 * Get all platform managers
 */
adminRouter.get("/managers", async (_req: Request, res: Response): Promise<void> => {
  try {
    const managers = await getAllPlatformManagers();
    res.status(200).json({ success: true, managers });
  } catch (error) {
    console.error("Get platform managers error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /admin/managers
 * Add a platform manager
 */
adminRouter.post("/managers", async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;

    if (!userId || isNaN(parseInt(userId, 10))) {
      res.status(400).json({ success: false, message: "Valid user ID is required" });
      return;
    }

    const user = await findUserById(parseInt(userId, 10));
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const alreadyManager = await isPlatformManager(parseInt(userId, 10));
    if (alreadyManager) {
      res.status(400).json({ success: false, message: "User is already a platform manager" });
      return;
    }

    await addPlatformManager(parseInt(userId, 10));
    res.status(201).json({ success: true, message: "Platform manager added" });
  } catch (error) {
    console.error("Add platform manager error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * DELETE /admin/managers/:userId
 * Remove a platform manager
 */
adminRouter.delete("/managers/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const authReq = req as AuthenticatedRequest;
    const currentUserId = parseInt(authReq.userId, 10);

    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    // Prevent removing yourself
    if (userId === currentUserId) {
      res.status(400).json({ success: false, message: "Cannot remove yourself as platform manager" });
      return;
    }

    const removed = await removePlatformManager(userId);
    if (!removed) {
      res.status(404).json({ success: false, message: "Platform manager not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Platform manager removed" });
  } catch (error) {
    console.error("Remove platform manager error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// ============ USER MANAGEMENT ============

/**
 * GET /admin/users
 * Get all users
 */
adminRouter.get("/users", async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * POST /admin/users
 * Create a new user
 */
adminRouter.post("/users", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ success: false, message: "Name is required" });
      return;
    }

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      res.status(400).json({ success: false, message: "Email is required" });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      return;
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(email.trim());
    if (existingUser) {
      res.status(400).json({ success: false, message: "Email already in use" });
      return;
    }

    const pwdHash = await Bun.password.hash(password);
    const user = await createUser(name.trim(), email.trim(), pwdHash);

    res.status(201).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * PUT /admin/users/:userId
 * Update a user
 */
adminRouter.put("/users/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { name, email, password } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Validate inputs if provided
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      res.status(400).json({ success: false, message: "Name cannot be empty" });
      return;
    }

    if (email !== undefined && (typeof email !== "string" || email.trim().length === 0)) {
      res.status(400).json({ success: false, message: "Email cannot be empty" });
      return;
    }

    // Check if new email is already taken by another user
    if (email && email.trim() !== user.email) {
      const existingUser = await findUserByEmail(email.trim());
      if (existingUser && existingUser.id !== userId) {
        res.status(400).json({ success: false, message: "Email already in use" });
        return;
      }
    }

    if (password !== undefined && (typeof password !== "string" || password.length < 6)) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
      return;
    }

    // Prepare update data
    const updateData: { name?: string; email?: string; pwd_hash?: string } = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.trim();
    if (password) updateData.pwd_hash = await Bun.password.hash(password);

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, message: "No fields to update" });
      return;
    }

    await updateUser(userId, updateData);
    res.status(200).json({ success: true, message: "User updated" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

/**
 * DELETE /admin/users/:userId
 * Delete a user
 */
adminRouter.delete("/users/:userId", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const authReq = req as AuthenticatedRequest;
    const currentUserId = parseInt(authReq.userId, 10);

    if (isNaN(userId)) {
      res.status(400).json({ success: false, message: "Invalid user ID" });
      return;
    }

    // Prevent deleting yourself
    if (userId === currentUserId) {
      res.status(400).json({ success: false, message: "Cannot delete yourself" });
      return;
    }

    const deleted = await deleteUser(userId);
    if (!deleted) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error: any) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      res.status(400).json({ success: false, message: "Cannot delete user with team memberships or incidents" });
      return;
    }
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default adminRouter;
