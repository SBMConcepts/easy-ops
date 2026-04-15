import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useEmployees } from "../hooks/useSupabaseData";
import { UserPlus, Search } from "lucide-react";
import { Input } from "../components/ui/input";
import { useState } from "react";
import { toast } from "sonner";

type EmployeeRow = {
  id: string;
  full_name?: string;
  email?: string;
  department?: string;
  site?: string;
  user_roles?: { role?: string }[];
};

const EmployeeManagement = () => {
  const [search, setSearch] = useState("");
  const { data: employees, isLoading } = useEmployees();
  const employeeRows = (employees || []) as unknown as EmployeeRow[];

  const filtered = employeeRows.filter(
    (e) =>
      (e.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage profiles, roles, and permissions</p>
        </div>
        <Button onClick={() => toast.info("Invite employees via the Sign Up page")}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-muted-foreground font-medium">Name</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Department</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Site</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Role</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => {
                  return (
                    <tr key={employee.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-foreground">{employee.full_name || "—"}</td>
                      <td className="p-4 text-muted-foreground">{employee.email}</td>
                      <td className="p-4 text-foreground">{employee.department || "—"}</td>
                      <td className="p-4 text-muted-foreground">{employee.site || "—"}</td>
                    <td className="p-4"><Badge variant="outline">{employee.user_roles?.[0]?.role || "employee"}</Badge></td>
                    <td className="p-4">
                      <Button variant="ghost" size="sm" onClick={() => toast.info(`Edit ${employee.full_name} — coming soon`)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No employees found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeManagement;
