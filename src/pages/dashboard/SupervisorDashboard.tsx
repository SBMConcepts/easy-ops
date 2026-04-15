/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useAttendanceRecords } from "../../hooks/useSupabaseData";
import { UserCheck, Clock, AlertTriangle, QrCode } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  present: "bg-secondary/10 text-secondary border-secondary/20",
  late: "bg-accent/10 text-accent-foreground border-accent/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
  on_leave: "bg-muted text-muted-foreground border-muted",
};

const SupervisorDashboard = () => {
  const navigate = useNavigate();
  const { data: reportData, isLoading } = useAttendanceRecords();
  const stats = reportData?.stats;
  const records = reportData?.records || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Supervisor Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Team overview</p>
        </div>
        <Button onClick={() => navigate("/app/check-in")} className="bg-secondary hover:bg-secondary/90">
          <QrCode className="h-4 w-4 mr-2" />
          Quick Check-In
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-secondary" />
            <div>
              <p className="text-2xl font-bold font-display">{stats?.present || 0}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-accent" />
            <div>
              <p className="text-2xl font-bold font-display">{stats?.late || 0}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold font-display">{stats?.absent || 0}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {records.map((rec: any) => (
              <div key={rec.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{rec.profiles?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{rec.sites?.name || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  {rec.clock_in && (
                    <span className="text-xs font-mono text-foreground">
                      {new Date(rec.clock_in).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <Badge variant="outline" className={statusColors[rec.status] || ""}>{rec.status}</Badge>
                </div>
              </div>
            ))}
            {records.length === 0 && <p className="text-sm text-muted-foreground">No team records today.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupervisorDashboard;
