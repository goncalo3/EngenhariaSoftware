import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { TeamIncidentStats } from "@/api/dashboard";

interface TeamStatsChartProps {
  stats: TeamIncidentStats[];
}

const statusColors = {
  pending: "#fbbf24",      // yellow
  under_review: "#3b82f6", // blue
  escalated: "#ef4444",    // red
  resolved: "#22c55e",     // green
};

function CircularChart({ 
  data, 
  teamName 
}: { 
  data: { pending: number; under_review: number; escalated: number; resolved: number };
  teamName: string;
}) {
  const total = data.pending + data.under_review + data.escalated + data.resolved;
  
  if (total === 0) {
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
            />
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm fill-muted-foreground"
            >
              0
            </text>
          </svg>
        </div>
        <span className="text-lg font-medium mt-3 text-center">{teamName}</span>
        <span className="text-sm text-muted-foreground">No incidents</span>
      </div>
    );
  }

  const segments = [
    { key: "pending", value: data.pending, color: statusColors.pending, label: "Pending" },
    { key: "under_review", value: data.under_review, color: statusColors.under_review, label: "Under Review" },
    { key: "escalated", value: data.escalated, color: statusColors.escalated, label: "Escalated" },
    { key: "resolved", value: data.resolved, color: statusColors.resolved, label: "Resolved" },
  ].filter(s => s.value > 0);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative offsets for each segment
  let cumulativeOffset = 0;
  const segmentsWithOffset = segments.map((segment) => {
    const percentage = segment.value / total;
    const strokeLength = percentage * circumference;
    const offset = cumulativeOffset;
    cumulativeOffset += strokeLength;
    return { ...segment, strokeLength, offset };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          {segmentsWithOffset.map((segment) => (
            <circle
              key={segment.key}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="12"
              strokeDasharray={`${segment.strokeLength} ${circumference}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{total}</span>
        </div>
      </div>
      <span className="text-lg font-medium mt-3 text-center">{teamName}</span>
      
      {/* Stats breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {data.pending > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.pending }} />
            <span>Pending: {data.pending}</span>
          </div>
        )}
        {data.under_review > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.under_review }} />
            <span>Under Review: {data.under_review}</span>
          </div>
        )}
        {data.escalated > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.escalated }} />
            <span>Escalated: {data.escalated}</span>
          </div>
        )}
        {data.resolved > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.resolved }} />
            <span>Resolved: {data.resolved}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamStatsChart({ stats }: TeamStatsChartProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : stats.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < stats.length - 1 ? prev + 1 : 0));
  };

  const currentTeam = stats[currentIndex];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Team Incident Status</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0">
        {stats.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            No teams found
          </div>
        ) : (
          <>
            <div className="flex-1 flex items-center justify-center py-4">
              {currentTeam && (
                <CircularChart
                  data={{
                    pending: Number(currentTeam.pending) || 0,
                    under_review: Number(currentTeam.under_review) || 0,
                    escalated: Number(currentTeam.escalated) || 0,
                    resolved: Number(currentTeam.resolved) || 0,
                  }}
                  teamName={currentTeam.team_name}
                />
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center text-xs py-3 border-t">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.pending }} />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.under_review }} />
                <span>Under Review</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.escalated }} />
                <span>Escalated</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.resolved }} />
                <span>Resolved</span>
              </div>
            </div>

            {/* Pagination */}
            {stats.length > 1 && (
              <div className="pt-3 border-t">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); goToPrevious(); }}
                      />
                    </PaginationItem>
                    {stats.map((_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink
                          href="#"
                          isActive={index === currentIndex}
                          onClick={(e) => { e.preventDefault(); setCurrentIndex(index); }}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); goToNext(); }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
