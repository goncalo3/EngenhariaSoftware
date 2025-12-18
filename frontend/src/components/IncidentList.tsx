import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { Incident, IncidentStatus } from "@/api/incidents";

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

type SortField = "title" | "status" | "team" | null;
type SortOrder = "asc" | "desc";

interface IncidentListProps {
  title: string;
  incidents: Incident[];
  teams: { id: number; name: string }[];
  emptyMessage?: string;
  onEdit: (incident: Incident) => void;
  showTeamColumn?: boolean;
}

export function IncidentList({
  title,
  incidents,
  teams,
  emptyMessage = "No incidents found",
  onEdit,
  showTeamColumn = true,
}: IncidentListProps) {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const getTeamName = (teamId: number) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.name || `Team ${teamId}`;
  };

  const statusOrder: Record<IncidentStatus, number> = {
    escalated: 0,
    pending: 1,
    under_review: 2,
    resolved: 3,
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order or reset
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortField(null);
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const sortedIncidents = [...incidents].sort((a, b) => {
    if (!sortField) return 0;

    let comparison = 0;
    if (sortField === "title") {
      comparison = a.title.localeCompare(b.title);
    } else if (sortField === "status") {
      comparison = statusOrder[a.status] - statusOrder[b.status];
    } else if (sortField === "team") {
      comparison = getTeamName(a.team_id).localeCompare(getTeamName(b.team_id));
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto pt-0">
        {sortedIncidents.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {emptyMessage}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 -ml-2 font-medium"
                    onClick={() => handleSort("title")}
                  >
                    Title
                    {getSortIcon("title")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 -ml-2 font-medium"
                    onClick={() => handleSort("status")}
                  >
                    Status
                    {getSortIcon("status")}
                  </Button>
                </TableHead>
                {showTeamColumn && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 -ml-2 font-medium"
                      onClick={() => handleSort("team")}
                    >
                      Team
                      {getSortIcon("team")}
                    </Button>
                  </TableHead>
                )}
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedIncidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell className="font-medium max-w-[150px] truncate">
                    {incident.title}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[incident.status]}>
                      {statusLabels[incident.status]}
                    </Badge>
                  </TableCell>
                  {showTeamColumn && (
                    <TableCell className="text-sm text-muted-foreground">
                      {getTeamName(incident.team_id)}
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(incident)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
