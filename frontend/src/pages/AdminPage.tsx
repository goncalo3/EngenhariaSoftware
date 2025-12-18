import { useState, useEffect } from "react";
import { AppLayout } from "@/components";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Edit, Users, Building2, Shield, UserPlus, Save, CheckCircle } from "lucide-react";
import {
  checkPlatformManagerStatus,
  getAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getTeamMembers,
  addTeamMember,
  updateMemberRole,
  removeTeamMember,
  getPlatformManagers,
  addPlatformManager,
  removePlatformManager,
  getAdminUsers,
  createUser,
  updateUser,
  deleteUser,
  type Team,
  type TeamMember,
  type PlatformManager,
  type AdminUser,
} from "@/api/admin";

export function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [managers, setManagers] = useState<PlatformManager[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddManagerOpen, setIsAddManagerOpen] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form states
  const [newTeamName, setNewTeamName] = useState("");
  const [editTeamName, setEditTeamName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"user" | "manager" | "admin">("user");

  // User form states
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");

  // Track pending role changes: { memberId: newRole }
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<number, "user" | "manager" | "admin">>({});

  // Success message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    const hasAccess = await checkPlatformManagerStatus();
    setIsAuthorized(hasAccess);
    if (hasAccess) {
      loadData();
    } else {
      setIsLoading(false);
    }
  }

  async function loadData() {
    setIsLoading(true);
    try {
      const [teamsData, managersData, usersData] = await Promise.all([
        getAllTeams(),
        getPlatformManagers(),
        getAdminUsers(),
      ]);
      setTeams(teamsData);
      setManagers(managersData);
      setAllUsers(usersData);
      if (teamsData.length > 0 && !selectedTeam) {
        selectTeam(teamsData[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }

  async function selectTeam(team: Team) {
    setSelectedTeam(team);
    try {
      const members = await getTeamMembers(team.id);
      setTeamMembers(members);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    }
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    try {
      await createTeam(newTeamName.trim());
      setNewTeamName("");
      setIsCreateTeamOpen(false);
      loadData();
      showSuccess("Team created successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    }
  }

  async function handleEditTeam() {
    if (!selectedTeam || !editTeamName.trim()) return;
    try {
      await updateTeam(selectedTeam.id, editTeamName.trim());
      setIsEditTeamOpen(false);
      loadData();
      showSuccess("Team updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team");
    }
  }

  async function handleDeleteTeam(teamId: number) {
    if (!confirm("Are you sure you want to delete this team?")) return;
    try {
      await deleteTeam(teamId);
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null);
        setTeamMembers([]);
      }
      loadData();
      showSuccess("Team deleted successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team");
    }
  }

  async function handleAddMember() {
    if (!selectedTeam || !selectedUserId) return;
    try {
      await addTeamMember(selectedTeam.id, parseInt(selectedUserId), selectedRole);
      setSelectedUserId("");
      setSelectedRole("user");
      setIsAddMemberOpen(false);
      selectTeam(selectedTeam);
      showSuccess("Member added successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  function handleRoleChange(userId: number, newRole: "user" | "manager" | "admin", currentRole: string) {
    if (newRole === currentRole) {
      setPendingRoleChanges((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } else {
      setPendingRoleChanges((prev) => ({ ...prev, [userId]: newRole }));
    }
  }

  async function handleSaveRole(userId: number) {
    if (!selectedTeam) return;
    const newRole = pendingRoleChanges[userId];
    if (!newRole) return;

    try {
      await updateMemberRole(selectedTeam.id, userId, newRole);
      setPendingRoleChanges((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      selectTeam(selectedTeam);
      showSuccess("Role updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!selectedTeam) return;
    if (!confirm("Remove this member from the team?")) return;
    try {
      await removeTeamMember(selectedTeam.id, userId);
      selectTeam(selectedTeam);
      showSuccess("Member removed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  async function handleAddManager() {
    if (!selectedUserId) return;
    try {
      await addPlatformManager(parseInt(selectedUserId));
      setSelectedUserId("");
      setIsAddManagerOpen(false);
      loadData();
      showSuccess("Platform manager added successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add manager");
    }
  }

  async function handleRemoveManager(userId: number) {
    if (!confirm("Remove this platform manager?")) return;
    try {
      await removePlatformManager(userId);
      loadData();
      showSuccess("Platform manager removed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove manager");
    }
  }

  // User management handlers
  async function handleCreateUser() {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) return;
    try {
      await createUser(newUserName.trim(), newUserEmail.trim(), newUserPassword);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setIsCreateUserOpen(false);
      loadData();
      showSuccess("User created successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  function openEditUser(user: AdminUser) {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserPassword("");
    setIsEditUserOpen(true);
  }

  async function handleEditUser() {
    if (!editingUser) return;
    
    const updates: { name?: string; email?: string; password?: string } = {};
    if (editUserName.trim() && editUserName.trim() !== editingUser.name) {
      updates.name = editUserName.trim();
    }
    if (editUserEmail.trim() && editUserEmail.trim() !== editingUser.email) {
      updates.email = editUserEmail.trim();
    }
    if (editUserPassword) {
      updates.password = editUserPassword;
    }

    if (Object.keys(updates).length === 0) {
      setIsEditUserOpen(false);
      return;
    }

    try {
      await updateUser(editingUser.id, updates);
      setIsEditUserOpen(false);
      setEditingUser(null);
      loadData();
      showSuccess("User updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function handleDeleteUser(userId: number) {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteUser(userId);
      loadData();
      showSuccess("User deleted successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  // Get users not in current team
  const availableUsers = allUsers.filter(
    (u) => !teamMembers.some((m) => m.id === u.id)
  );

  // Get users not platform managers
  const availableManagers = allUsers.filter(
    (u) => !managers.some((m) => m.user_id === u.id)
  );

  if (isAuthorized === null || isLoading) {
    return (
      <AppLayout title="Platform Administration">
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </AppLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <AppLayout title="Platform Administration">
        <div className="text-center py-12">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">You do not have access to this page.</p>
          <p className="text-sm text-muted-foreground mt-2">Platform manager privileges required.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Platform Administration">
      <div className="space-y-6">
        {successMessage && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
            <button className="ml-2 underline" onClick={() => setError(null)}>
              Dismiss
            </button>
          </div>
        )}

        <Tabs defaultValue="teams">
          <TabsList>
            <TabsTrigger value="teams" className="gap-2">
              <Building2 className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="managers" className="gap-2">
              <Shield className="h-4 w-4" />
              Platform Managers
            </TabsTrigger>
          </TabsList>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Teams List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Teams</h2>
                  <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Team</DialogTitle>
                        <DialogDescription>Create a new team</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Team Name</Label>
                          <Input
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="Enter team name"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateTeamOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateTeam} disabled={!newTeamName.trim()}>
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teams yet</p>
                ) : (
                  teams.map((team) => (
                    <Card
                      key={team.id}
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedTeam?.id === team.id ? "border-primary" : ""
                      }`}
                      onClick={() => selectTeam(team)}
                    >
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{team.name}</CardTitle>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTeamName(team.name);
                                setSelectedTeam(team);
                                setIsEditTeamOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTeam(team.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>

              {/* Team Members */}
              <div className="md:col-span-2">
                {selectedTeam ? (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {selectedTeam.name} Members
                          </CardTitle>
                          <CardDescription>Manage team members and roles</CardDescription>
                        </div>
                        <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <UserPlus className="h-4 w-4 mr-2" />
                              Add Member
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Team Member</DialogTitle>
                              <DialogDescription>Add a user to {selectedTeam.name}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>User</Label>
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableUsers.map((user) => (
                                      <SelectItem key={user.id} value={user.id.toString()}>
                                        {user.name} ({user.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleAddMember} disabled={!selectedUserId}>
                                Add
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {teamMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No members in this team
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamMembers.map((member) => {
                              const hasPendingChange = member.id in pendingRoleChanges;
                              const displayRole = hasPendingChange ? pendingRoleChanges[member.id] : member.role;
                              return (
                                <TableRow key={member.id}>
                                  <TableCell className="font-medium">{member.name}</TableCell>
                                  <TableCell>{member.email}</TableCell>
                                  <TableCell>
                                    <Select
                                      value={displayRole}
                                      onValueChange={(v) => handleRoleChange(member.id, v as "user" | "manager" | "admin", member.role)}
                                    >
                                      <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {hasPendingChange && (
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-green-600 hover:text-green-700"
                                          onClick={() => handleSaveRole(member.id)}
                                        >
                                          <Save className="h-4 w-4" />
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => handleRemoveMember(member.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Select a team to manage members
                  </div>
                )}
              </div>
            </div>

            {/* Edit Team Dialog */}
            <Dialog open={isEditTeamOpen} onOpenChange={setIsEditTeamOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Team</DialogTitle>
                  <DialogDescription>Update team name</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Team Name</Label>
                    <Input
                      value={editTeamName}
                      onChange={(e) => setEditTeamName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditTeamOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditTeam} disabled={!editTeamName.trim()}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Users
                    </CardTitle>
                    <CardDescription>Create and manage platform users</CardDescription>
                  </div>
                  <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Create User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create User</DialogTitle>
                        <DialogDescription>Create a new platform user</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            placeholder="Enter user name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="Enter email address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <Input
                            type="password"
                            value={newUserPassword}
                            onChange={(e) => setNewUserPassword(e.target.value)}
                            placeholder="Enter password (min 6 characters)"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateUser}
                          disabled={!newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 6}
                        >
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {allUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No users found
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>ID</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="text-muted-foreground">{user.id}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditUser(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit User</DialogTitle>
                  <DialogDescription>Update user details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      placeholder="Enter user name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password (leave empty to keep current)</Label>
                    <Input
                      type="password"
                      value={editUserPassword}
                      onChange={(e) => setEditUserPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditUser}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Platform Managers Tab */}
          <TabsContent value="managers" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Platform Managers
                    </CardTitle>
                    <CardDescription>Users with full platform administration access</CardDescription>
                  </div>
                  <Dialog open={isAddManagerOpen} onOpenChange={setIsAddManagerOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Manager
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Platform Manager</DialogTitle>
                        <DialogDescription>Grant platform manager access to a user</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>User</Label>
                          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableManagers.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddManagerOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddManager} disabled={!selectedUserId}>
                          Add
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {managers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No platform managers
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managers.map((manager) => (
                        <TableRow key={manager.user_id}>
                          <TableCell className="font-medium">{manager.name}</TableCell>
                          <TableCell>{manager.email}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleRemoveManager(manager.user_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default AdminPage;
