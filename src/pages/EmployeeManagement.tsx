import { useState } from "react"
import { supabase } from "../integrations/supabase/client"
import { useAuth } from "../contexts/AuthContext"
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { useEmployees } from "../hooks/useSupabaseData"
import { Search } from "lucide-react"
import { Input } from "../components/ui/input"
import { toast } from "sonner"
import { InviteEmployeeDialog } from "../components/employees/InviteEmployeeDialog"

type AppRole = "manager" | "supervisor" | "employee"

interface Employee {
    id: string
    full_name: string
    email: string
    role: AppRole
    department: string | null
    site: string | null
}

const ROLE_LABELS: Record<AppRole, string> = {
    manager: "Manager",
    supervisor: "Supervisor",
    employee: "Employee",
}

export default function EmployeeManagement() {
    const { user } = useAuth()
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loadingList, setLoadingList] = useState(true)
    const [listError, setListError] = useState<string | null>(null)
    const [search, setSearch] = useState("")

    const filtered = (employees || []).filter(
        (e) =>
            (e.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
            (e.department || "").toLowerCase().includes(search.toLowerCase())
    )

    // ── Fetch employees on mount ──────────────────────────────────────────────
    // We join profiles → user_roles to get role in one query.
    useState(() => {
        ;(async () => {
            setLoadingList(true)
            const { data: profiles, error } = await supabase
                .from("profiles")
                .select("id, full_name, email, department, site")
                .eq("organisation_id", user?.organisation_id ?? "")
                .neq("id", user?.id ?? "") // exclude the current admin from the list

            if (error) {
                setListError("Could not load employees.")
            } else {
                const userIds = (profiles ?? []).map((p) => p.id)
                const { data: roles } = userIds.length
                    ? await supabase
                          .from("user_roles")
                          .select("user_id, role")
                          .in("user_id", userIds)
                    : { data: [] }

                const roleMap = Object.fromEntries(
                    (roles ?? []).map((r: any) => [r.user_id, r.role])
                )
                const rows: Employee[] = (profiles ?? []).map((p: any) => ({
                    id: p.id,
                    full_name: p.full_name,
                    email: p.email,
                    role: (roleMap[p.id] ?? "employee") as AppRole,
                    department: p.department,
                    site: p.site,
                }))
                setEmployees(rows)
            }
            setLoadingList(false)
        })()
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">
                        Employee Management
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage profiles, roles, and permissions
                    </p>
                </div>
                <InviteEmployeeDialog
                    onInvited={(emp) =>
                        setEmployees((prev) => [
                            ...prev,
                            { ...emp, role: emp.role as AppRole },
                        ])
                    }
                />
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
                                    <th className="text-left p-4 text-muted-foreground font-medium">
                                        Name
                                    </th>
                                    <th className="text-left p-4 text-muted-foreground font-medium">
                                        Email
                                    </th>
                                    <th className="text-left p-4 text-muted-foreground font-medium">
                                        Department
                                    </th>
                                    <th className="text-left p-4 text-muted-foreground font-medium">
                                        Site
                                    </th>
                                    <th className="text-left p-4 text-muted-foreground font-medium">
                                        Role
                                    </th>
                                    <th className="text-left p-4 text-muted-foreground font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp) => (
                                    <tr
                                        key={emp.id}
                                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="p-4 font-medium text-foreground">
                                            {emp.full_name || "—"}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {emp.email}
                                        </td>
                                        <td className="p-4 text-foreground">
                                            {emp.department || "—"}
                                        </td>
                                        <td className="p-4 text-muted-foreground">
                                            {emp.site || "—"}
                                        </td>
                                        <td className="p-4">
                                            <Badge variant="outline">
                                                {ROLE_LABELS[emp.role]}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    toast.info(
                                                        `Edit ${emp.full_name} — coming soon`
                                                    )
                                                }
                                            >
                                                Edit
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {employees.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="p-4 text-center text-muted-foreground"
                                        >
                                            No employees found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
