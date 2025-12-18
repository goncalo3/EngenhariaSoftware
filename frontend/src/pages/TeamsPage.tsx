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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Users, UserPlus, Trash2, Save, CheckCircle } from "lucide-react";
import { getMyTeams, getTeamUsers, getAllUsers, type Team, type UserWithRole, type UserPublic } from "@/api/users";
import {
  getMyRoleInTeam,
  addUserToTeamAsAdmin,
  updateMemberRoleAsAdmin,
  removeMemberAsAdmin,
  type TeamRole,
} from "@/api/teams";

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800",
  manager: "bg-blue-100 text-blue-800",
  user: "bg-gray-100 text-gray-800",
};

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [myRoleInTeam, setMyRoleInTeam] = useState<TeamRole | null>(null);
  const [teamUsers, setTeamUsers] = useState<UserWithRole[]>([]);
  const [allUsers, setAllUsers] = useState<UserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog state
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"user" | "manager">("user");

  // Pending role changes
  const [pendingRoleChanges, setPendingRoleChanges] = useState<Record<number, "user" | "manager">>({});

  const isTeamAdmin = myRoleInTeam === "admin";

  useEffect(() => {
    loadTeams();
    loadAllUsers();
  }, []);

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function loadTeams() {
    try {
      const data = await getMyTeams();
      setTeams(data);
      if (data.length > 0) {
        selectTeam(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAllUsers() {
    try {
      const users = await getAllUsers();
      setAllUsers(users);
    } catch {
      // Silently fail - not critical
    }
  }

  async function selectTeam(team: Team) {
    setSelectedTeam(team);
    setIsLoadingUsers(true);
    setPendingRoleChanges({});
    try {
      const [users, role] = await Promise.all([
        getTeamUsers(team.id),
        getMyRoleInTeam(team.id),
      ]);
      setTeamUsers(users);
      setMyRoleInTeam(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members");
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function handleAddMember() {
    if (!selectedTeam || !selectedUserId) return;
    try {
      await addUserToTeamAsAdmin(selectedTeam.id, parseInt(selectedUserId), selectedRole);
      setSelectedUserId("");
      setSelectedRole("user");
      setIsAddMemberOpen(false);
      selectTeam(selectedTeam);
      showSuccess("Member added successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  function handleRoleChange(userId: number, newRole: "user" | "manager", currentRole: string) {
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
      await updateMemberRoleAsAdmin(selectedTeam.id, userId, newRole);
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
      await removeMemberAsAdmin(selectedTeam.id, userId);
      selectTeam(selectedTeam);
      showSuccess("Member removed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  // Get users not in current team
  const availableUsers = allUsers.filter(
    (u) => !teamUsers.some((m) => m.id === u.id)
  );

  return (
    <AppLayout title="Teams">
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

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You are not a member of any team yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Teams list */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">My Teams</h2>
              {teams.map((team) => (
                <Card
                  key={team.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedTeam?.id === team.id ? "border-primary" : ""
                  }`}
                  onClick={() => selectTeam(team)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {team.name}
                    </CardTitle>
                    <CardDescription>
                      <Badge className={roleColors[team.role] || roleColors.user}>
                        {team.role}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Team members */}
            <div className="md:col-span-2">
              {selectedTeam && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          {selectedTeam.name} Members
                        </CardTitle>
                        <CardDescription>
                          Team members and their roles
                          {isTeamAdmin && " • You can manage members"}
                        </CardDescription>
                      </div>
                      {isTeamAdmin && (
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
                              <DialogDescription>
                                Add a user to {selectedTeam.name}
                              </DialogDescription>
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
                                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "user" | "manager")}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="manager">Manager</SelectItem>
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
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingUsers ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading members...
                      </div>
                    ) : teamUsers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No members found
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            {isTeamAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamUsers.map((user) => {
                            const isAdmin = user.role === "admin";
                            const hasPendingChange = user.id in pendingRoleChanges;
                            const displayRole = hasPendingChange ? pendingRoleChanges[user.id] : user.role;

                            return (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  {isTeamAdmin && !isAdmin ? (
                                    <Select
                                      value={displayRole}
                                      onValueChange={(v) => handleRoleChange(user.id, v as "user" | "manager", user.role)}
                                    >
                                      <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge className={roleColors[user.role] || roleColors.user}>
                                      {user.role}
                                    </Badge>
                                  )}
                                </TableCell>
                                {isTeamAdmin && (
                                  <TableCell>
                                    {!isAdmin && (
                                      <div className="flex gap-1">
                                        {hasPendingChange && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-green-600 hover:text-green-700"
                                            onClick={() => handleSaveRole(user.id)}
                                          >
                                            <Save className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive"
                                          onClick={() => handleRemoveMember(user.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    )}
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default TeamsPage;
