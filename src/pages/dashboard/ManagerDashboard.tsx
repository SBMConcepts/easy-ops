/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useAttendanceRecords } from "../../hooks/useSupabaseData";
import { Users, UserCheck, Clock, AlertTriangle, BarChart3 } from "lucide-react";

const statusColors: Record<string, string> = {
  present: "bg-secondary/10 text-secondary border-secondary/20",
  late: "bg-accent/10 text-accent-foreground border-accent/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
  on_leave: "bg-muted text-muted-foreground border-muted",
};

const ManagerDashboard = () => {
  const { data: reportData, isLoading } = useAttendanceRecords();
  const stats = reportData?.stats;
  const records = reportData?.records || [];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Manager Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Workforce monitoring and operational insights</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold font-display">{stats?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
          </CardContent>
        </Card>
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
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-secondary" />
            Attendance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {records.map((rec: any) => (
              <div key={rec.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{rec.profiles?.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{rec.profiles?.department || "—"} · {rec.sites?.name || "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase text-muted-foreground">{rec.method}</span>
                  {rec.clock_in && (
                    <span className="text-xs text-foreground font-mono">
                      {new Date(rec.clock_in).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <Badge variant="outline" className={statusColors[rec.status] || ""}>{rec.status}</Badge>
                </div>
              </div>
            ))}
            {records.length === 0 && <p className="text-sm text-muted-foreground">No attendance records today.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerDashboard;
