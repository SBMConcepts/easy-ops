import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { useAttendanceRecords } from "../hooks/useSupabaseData";
import { supabase } from "../integrations/client";
import { FileText, Download, BarChart3, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const Reports = () => {
  const { data: reportData, isLoading } = useAttendanceRecords();
  const stats = reportData?.stats;
  const records = reportData?.records || [];

  const handleExport = async (type: string) => {
    if (type === "Payroll Integration") {
      try {
        const today = new Date().toISOString().split("T")[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const { data, error } = await supabase.functions.invoke(
          `payroll-export?date_from=${thirtyDaysAgo}&date_to=${today}&format=csv`,
          { method: "GET" }
        );
        if (error) throw error;
        // Download CSV
        const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data)], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payroll_export_${today}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Payroll data exported");
      } catch (err: unknown) {
        toast.error((err as { message?: string })?.message || "Export failed");
      }
    } else {
      toast.success(`${type} report exported`);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Automated attendance and workforce reports</p>
        </div>
        <Button variant="outline" onClick={() => handleExport("Full")}>
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="shadow-card"><CardContent className="p-4 text-center"><BarChart3 className="h-6 w-6 text-secondary mx-auto mb-1" /><p className="text-xl font-bold font-display">{stats?.present || 0}</p><p className="text-xs text-muted-foreground">Present</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center"><Clock className="h-6 w-6 text-accent mx-auto mb-1" /><p className="text-xl font-bold font-display">{stats?.late || 0}</p><p className="text-xs text-muted-foreground">Late</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center"><AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-1" /><p className="text-xl font-bold font-display">{stats?.absent || 0}</p><p className="text-xs text-muted-foreground">Absent</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center"><TrendingUp className="h-6 w-6 text-primary mx-auto mb-1" /><p className="text-xl font-bold font-display">{(stats?.total_hours || 0).toFixed(1)}h</p><p className="text-xs text-muted-foreground">Total Hours</p></CardContent></Card>
        <Card className="shadow-card"><CardContent className="p-4 text-center"><TrendingUp className="h-6 w-6 text-accent mx-auto mb-1" /><p className="text-xl font-bold font-display">{(stats?.total_overtime || 0).toFixed(1)}h</p><p className="text-xs text-muted-foreground">Overtime</p></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {[
          { title: "Attendance Report", desc: "Daily/weekly attendance summary", icon: BarChart3 },
          { title: "Overtime Report", desc: "Hours exceeding standard working time", icon: Clock },
          { title: "Absenteeism Report", desc: "Absence patterns and trends", icon: AlertTriangle },
          { title: "Payroll Integration", desc: "Export data for salary processing", icon: FileText },
        ].map((report) => (
          <Card key={report.title} className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <report.icon className="h-6 w-6 text-secondary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{report.title}</p>
                <p className="text-xs text-muted-foreground">{report.desc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport(report.title)}>
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Detailed Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Employee</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Clock In</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Clock Out</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Hours</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Method</th>
                  <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec: any) => (
                  <tr key={rec.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-foreground">{rec.profiles?.full_name || "—"}</td>
                    <td className="py-2 text-muted-foreground">{rec.date}</td>
                    <td className="py-2 font-mono text-foreground">{rec.clock_in ? new Date(rec.clock_in).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="py-2 font-mono text-foreground">{rec.clock_out ? new Date(rec.clock_out).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="py-2 text-foreground">{rec.hours_worked ? `${rec.hours_worked}h` : "—"}</td>
                    <td className="py-2"><Badge variant="outline" className="text-xs">{rec.method}</Badge></td>
                    <td className="py-2">
                      <Badge variant="outline" className={`text-xs ${
                        rec.status === "present" ? "bg-secondary/10 text-secondary" :
                        rec.status === "late" ? "bg-accent/10 text-accent-foreground" :
                        "bg-destructive/10 text-destructive"
                      }`}>{rec.status}</Badge>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
