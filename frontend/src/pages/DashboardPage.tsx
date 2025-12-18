import { useState, useEffect } from "react";
import { AppLayout, IncidentList, TeamStatsChart } from "@/components";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import {
  getMyIncidents,
  getAssignedIncidents,
  getTeamIncidentStats,
  type TeamIncidentStats,
} from "@/api/dashboard";
import {
  updateIncident,
  type Incident,
  type IncidentStatus,
} from "@/api/incidents";
import { getMyTeams, type Team } from "@/api/users";

const statusColors: Record<IncidentStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  escalated: "bg-red-100 text-red-800",
  resolved: "bg-green-100 text-green-800",
};

export function DashboardPage() {
  const [myIncidents, setMyIncidents] = useState<Incident[]>([]);
  const [assignedIncidents, setAssignedIncidents] = useState<Incident[]>([]);
  const [teamStats, setTeamStats] = useState<TeamIncidentStats[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit dialog state
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<IncidentStatus>("pending");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setIsLoading(true);
    setError(null);

    try {
      const [myInc, assignedInc, stats, teamsData] = await Promise.all([
        getMyIncidents(),
        getAssignedIncidents(),
        getTeamIncidentStats(),
        getMyTeams(),
      ]);

      setMyIncidents(myInc);
      setAssignedIncidents(assignedInc);
      setTeamStats(stats);
      setTeams(teamsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  function openEditDialog(incident: Incident) {
    setEditingIncident(incident);
    setEditTitle(incident.title);
    setEditDescription(incident.description || "");
    setEditStatus(incident.status);
    setUpdateSuccess(false);
  }

  function closeEditDialog() {
    setEditingIncident(null);
    setEditTitle("");
    setEditDescription("");
    setEditStatus("pending");
    setUpdateSuccess(false);
  }

  async function handleUpdateIncident() {
    if (!editingIncident) return;

    setIsUpdating(true);
    setError(null);

    try {
      const updates: { title?: string; description?: string; status?: IncidentStatus } = {};

      if (editTitle !== editingIncident.title) {
        updates.title = editTitle;
      }
      if (editDescription !== (editingIncident.description || "")) {
        updates.description = editDescription;
      }
      if (editStatus !== editingIncident.status) {
        updates.status = editStatus;
      }

      if (Object.keys(updates).length > 0) {
        await updateIncident(editingIncident.team_id, editingIncident.id, updates);
        setUpdateSuccess(true);
        
        // Reload data
        await loadDashboardData();
        
        // Close dialog after short delay
        setTimeout(() => {
          closeEditDialog();
        }, 1000);
      } else {
        closeEditDialog();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update incident");
    } finally {
      setIsUpdating(false);
    }
  }

  const getTeamName = (teamId: number) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.name || `Team ${teamId}`;
  };

  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
          {/* Left: Created by me */}
          <IncidentList
            title="Created by Me"
            incidents={myIncidents}
            teams={teams}
            emptyMessage="You haven't created any unresolved incidents"
            onEdit={openEditDialog}
          />

          {/* Center: Assigned to me */}
          <IncidentList
            title="Assigned to Me"
            incidents={assignedIncidents}
            teams={teams}
            emptyMessage="No incidents assigned to you"
            onEdit={openEditDialog}
          />

          {/* Right: Team stats chart */}
          <TeamStatsChart stats={teamStats} />
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingIncident} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Incident</DialogTitle>
            <DialogDescription>
              Update the incident details
            </DialogDescription>
          </DialogHeader>

          {updateSuccess ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Incident updated successfully!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4 py-4">
              {editingIncident && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Team:</span>
                  <Badge variant="outline">{getTeamName(editingIncident.team_id)}</Badge>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Incident title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe the incident..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as IncidentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors.pending}>Pending</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="under_review">
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors.under_review}>Under Review</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="escalated">
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors.escalated}>Escalated</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="resolved">
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors.resolved}>Resolved</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog} disabled={isUpdating}>
              Cancel
            </Button>
            {!updateSuccess && (
              <Button onClick={handleUpdateIncident} disabled={isUpdating || !editTitle.trim()}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
