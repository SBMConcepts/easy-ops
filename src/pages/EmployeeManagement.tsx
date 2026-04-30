import { useState } from "react"
import { supabase } from "../integrations/supabase/client"
import { useAuth } from "../contexts/AuthContext"
import { Card, CardContent } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { useEmployees } from "../hooks/useSupabaseData"
import { UserPlus, Search } from "lucide-react"
import { Input } from "../components/ui/input"
import { toast } from "sonner"

type AppRole = "manager" | "supervisor" | "employee"

interface Employee {
    id: string
    full_name: string
    email: string
    role: AppRole
    department: string | null
    site: string | null
}

interface InviteForm {
    full_name: string
    email: string
    role: AppRole
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
    const [showInvite, setShowInvite] = useState(false)
    const [form, setForm] = useState<InviteForm>({
        full_name: "",
        email: "",
        role: "employee",
    })
    const [inviting, setInviting] = useState(false)
    const [inviteError, setInviteError] = useState<string | null>(null)
    const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

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
            const { data, error } = await supabase
                .from("profiles")
                .select(
                    "id, full_name, email, department, site, user_roles(role)"
                )
                .eq("organisation_id", user?.organisation_id ?? "")
                .neq("id", user?.id ?? "") // exclude the current admin from the list

            if (error) {
                setListError("Could not load employees.")
            } else {
                const rows: Employee[] = (data ?? []).map((p: any) => ({
                    id: p.id,
                    full_name: p.full_name,
                    email: p.email,
                    role: (p.user_roles?.[0]?.role ?? "employee") as AppRole,
                    department: p.department,
                    site: p.site,
                }))
                setEmployees(rows)
            }
            setLoadingList(false)
        })()
    })

    // ── Invite handler ────────────────────────────────────────────────────────

    const sendInvite = async () => {
        setInviteError(null)
        setInviteSuccess(null)

        if (!form.full_name.trim()) {
            setInviteError("Full name is required.")
            return
        }
        if (!form.email.trim() || !form.email.includes("@")) {
            setInviteError("A valid email address is required.")
            return
        }

        setInviting(true)
        try {
            // Call the Edge Function — the service role key lives only there.
            // supabase.functions.invoke() automatically attaches the current
            // user's JWT as the Authorization header, which the function uses
            // to verify the caller is an admin before proceeding.
            const { data, error } = await supabase.functions.invoke(
                "invite-employee",
                {
                    body: {
                        email: form.email.trim(),
                        full_name: form.full_name.trim(),
                        role: form.role,
                        organisation_id: user?.organisation_id,
                    },
                }
            )

            if (error) throw error
            if (data?.error) throw new Error(data.error)

            setInviteSuccess(
                `Invite sent to ${form.email}. They'll receive an email to set their password and log in.`
            )
            // Optimistically add to the list so the admin sees feedback immediately
            setEmployees((prev) => [
                ...prev,
                {
                    id: data.user_id,
                    full_name: form.full_name.trim(),
                    email: form.email.trim(),
                    role: form.role,
                    department: null,
                    site: null,
                },
            ])
            setForm({ full_name: "", email: "", role: "employee" })
        } catch (err: unknown) {
            setInviteError(
                err instanceof Error
                    ? err.message
                    : "Failed to send invite. Please try again."
            )
        } finally {
            setInviting(false)
        }
    }

    const closeInvite = () => {
        setShowInvite(false)
        setInviteError(null)
        setInviteSuccess(null)
        setForm({ full_name: "", email: "", role: "employee" })
    }
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
                <Button onClick={() => setShowInvite(true)}>
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
                    {/* ── Invite modal ── */}
                    {showInvite && (
                        <div
                            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) closeInvite()
                            }}
                        >
                            <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-5 shadow-2xl">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-base font-semibold text-zinc-100">
                                            Invite a team member
                                        </h2>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            They'll receive an email to verify
                                            and set their password.
                                        </p>
                                    </div>
                                    <button
                                        onClick={closeInvite}
                                        className="text-zinc-600 hover:text-zinc-300 transition-colors text-lg leading-none"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <ModalField label="Full name">
                                        <ModalInput
                                            value={form.full_name}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    full_name: e.target.value,
                                                }))
                                            }
                                            placeholder="Jane Smith"
                                            autoFocus
                                        />
                                    </ModalField>

                                    <ModalField label="Work email">
                                        <ModalInput
                                            type="email"
                                            value={form.email}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    email: e.target.value,
                                                }))
                                            }
                                            placeholder="jane@yourcompany.com"
                                        />
                                    </ModalField>

                                    <ModalField label="Role">
                                        <select
                                            value={form.role}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    role: e.target
                                                        .value as AppRole,
                                                }))
                                            }
                                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="employee">
                                                Employee
                                            </option>
                                            <option value="supervisor">
                                                Supervisor
                                            </option>
                                            <option value="manager">
                                                Manager
                                            </option>
                                        </select>
                                    </ModalField>
                                </div>

                                {/* Feedback */}
                                {inviteError && (
                                    <p className="text-sm text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-4 py-2.5">
                                        {inviteError}
                                    </p>
                                )}
                                {inviteSuccess && (
                                    <p className="text-sm text-green-400 bg-green-950/40 border border-green-800 rounded-lg px-4 py-2.5">
                                        {inviteSuccess}
                                    </p>
                                )}

                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={closeInvite}
                                        className="flex-1 py-2.5 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={sendInvite}
                                        disabled={inviting || !!inviteSuccess}
                                        className="flex-1 py-2.5 text-sm font-semibold bg-amber-500 hover:bg-amber-400 disabled:bg-amber-900 disabled:text-amber-700 text-zinc-950 rounded-lg transition-colors"
                                    >
                                        {inviting
                                            ? "Sending…"
                                            : inviteSuccess
                                              ? "Sent ✓"
                                              : "Send invite"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

//Create a seperate modal file for invites
function ModalField({
    label,
    children,
}: {
    label: string
    children: React.ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {label}
            </label>
            {children}
        </div>
    )
}

function ModalInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow"
        />
    )
}
