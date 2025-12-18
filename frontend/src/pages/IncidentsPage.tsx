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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent } from "@/components/ui/card";
import { Plus, AlertTriangle, Eye } from "lucide-react";
import { getMyTeams, getTeamUsers, type Team, type UserWithRole } from "@/api/users";
import { getMyRoleInTeam, type TeamRole } from "@/api/teams";
import {
  getTeamIncidents,
  createIncident,
  updateIncident,
  type Incident,
  type IncidentStatus,
} from "@/api/incidents";

const statusColors: Record<IncidentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  escalated: "bg-red-100 text-red-800",
  resolved: "bg-green-100 text-green-800",
};

const statusLabels: Record<IncidentStatus, string> = {
  pending: "Pending",
  under_review: "Under Review",
  escalated: "Escalated",
  resolved: "Resolved",
};

export function IncidentsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserWithRole[]>([]);
  const [myRole, setMyRole] = useState<TeamRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<IncidentStatus>("pending");
  const [editAssignedTo, setEditAssignedTo] = useState<string>("unassigned");
  const [isUpdating, setIsUpdating] = useState(false);

  // View dialog state
  const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);

  const canAssign = myRole === "admin" || myRole === "manager";

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamData(selectedTeamId);
    }
  }, [selectedTeamId]);

  async function loadTeams() {
    try {
      const data = await getMyTeams();
      setTeams(data);
      if (data.length > 0) {
        setSelectedTeamId(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTeamData(teamId: number) {
    setIsLoading(true);
    try {
      const [incidentsData, membersData, roleData] = await Promise.all([
        getTeamIncidents(teamId),
        getTeamUsers(teamId),
        getMyRoleInTeam(teamId),
      ]);
      setIncidents(incidentsData);
      setTeamMembers(membersData);
      setMyRole(roleData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  }

  function getUserName(userId: number | null): string {
    if (!userId) return "Unassigned";
    const user = teamMembers.find((m) => m.id === userId);
    return user ? user.name : `User #${userId}`;
  }

  async function handleCreate() {
    if (!selectedTeamId || !newTitle.trim()) return;

    setIsCreating(true);
    try {
      await createIncident(selectedTeamId, {
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      setNewTitle("");
      setNewDescription("");
      setIsCreateOpen(false);
      loadTeamData(selectedTeamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create incident");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate() {
    if (!selectedTeamId || !editingIncident) return;

    setIsUpdating(true);
    try {
      const updates: {
        title?: string;
        description?: string;
        status?: IncidentStatus;
        assigned_to_user_id?: number | null;
      } = {};

      if (editTitle.trim() !== editingIncident.title) {
        updates.title = editTitle.trim();
      }
      if (editDescription.trim() !== (editingIncident.description || "")) {
        updates.description = editDescription.trim();
      }
      if (editStatus !== editingIncident.status) {
        updates.status = editStatus;
      }

      // Handle assignment change
      const currentAssigned = editingIncident.assigned_to_user_id?.toString() || "unassigned";
      if (editAssignedTo !== currentAssigned && canAssign) {
        updates.assigned_to_user_id =
          editAssignedTo === "unassigned" ? null : parseInt(editAssignedTo);
      }

      if (Object.keys(updates).length > 0) {
        await updateIncident(selectedTeamId, editingIncident.id, updates);
      }

      setEditingIncident(null);
      loadTeamData(selectedTeamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update incident");
    } finally {
      setIsUpdating(false);
    }
  }

  function openEditDialog(incident: Incident) {
    setEditingIncident(incident);
    setEditTitle(incident.title);
    setEditDescription(incident.description || "");
    setEditStatus(incident.status);
    setEditAssignedTo(incident.assigned_to_user_id?.toString() || "unassigned");
  }

  return (
    <AppLayout title="Incidents">
      <div className="space-y-4">
        {/* Team selector and create button */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="team-select">Team:</Label>
            <Select
              value={selectedTeamId?.toString() || ""}
              onValueChange={(value) => setSelectedTeamId(parseInt(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id.toString()}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {myRole && (
              <Badge variant="outline" className="ml-2">
                {myRole}
              </Badge>
            )}
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={!selectedTeamId}>
                <Plus className="h-4 w-4 mr-2" />
                New Incident
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Incident</DialogTitle>
                <DialogDescription>
                  Report a new incident for your team to track.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Brief summary of the incident..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed description of the incident..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating || !newTitle.trim()}>
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {/* Incidents table */}
        {teams.length === 0 && !isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You are not a member of any team yet.</p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No incidents found
                    </TableCell>
                  </TableRow>
                ) : (
                  incidents.map((incident) => (
                    <TableRow key={incident.id}>
                      <TableCell className="font-mono">#{incident.id}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {incident.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[incident.status]}>
                          {statusLabels[incident.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{getUserName(incident.reported_by_user_id)}</TableCell>
                      <TableCell>
                        {incident.assigned_to_user_id
                          ? getUserName(incident.assigned_to_user_id)
                          : <span className="text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingIncident(incident)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(incident)}
                          >
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* View incident dialog */}
        <Dialog open={!!viewingIncident} onOpenChange={(open) => !open && setViewingIncident(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">#{viewingIncident?.id}</span>
                {viewingIncident?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {viewingIncident && (
                  <Badge className={statusColors[viewingIncident.status]}>
                    {statusLabels[viewingIncident.status]}
                  </Badge>
                )}
              </div>
              <div>
                <span className="text-sm font-medium">Description</span>
                <Card className="mt-2">
                  <CardContent className="pt-4 max-h-[200px] overflow-y-auto">
                    {viewingIncident?.description ? (
                      <p className="text-sm whitespace-pre-wrap">{viewingIncident.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No description provided</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Reported by: {viewingIncident && getUserName(viewingIncident.reported_by_user_id)}</span>
                <span>
                  Assigned to:{" "}
                  {viewingIncident?.assigned_to_user_id
                    ? getUserName(viewingIncident.assigned_to_user_id)
                    : "Unassigned"}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingIncident(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (viewingIncident) {
                    openEditDialog(viewingIncident);
                    setViewingIncident(null);
                  }
                }}
              >
                Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit incident dialog */}
        <Dialog open={!!editingIncident} onOpenChange={(open) => !open && setEditingIncident(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Incident #{editingIncident?.id}</DialogTitle>
              <DialogDescription>Update the incident details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Incident title..."
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Detailed description..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as IncidentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {canAssign && (
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Select value={editAssignedTo} onValueChange={setEditAssignedTo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.name} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingIncident(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating || !editTitle.trim()}>
                {isUpdating ? "Updating..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default IncidentsPage;
