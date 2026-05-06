import { useEffect, useState } from "react"
import { z } from "zod"
import { useAuth } from "../contexts/AuthContext"
import { supabase } from "../integrations/supabase/client"
import { useQuery } from "@tanstack/react-query"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { toast } from "sonner"
import { Loader2, Save, User, Briefcase, Shield, Calendar } from "lucide-react"

const profileSchema = z.object({
    full_name: z.string().trim().min(1, "Name is required").max(100),
    phone: z.string().trim().max(30).optional().or(z.literal("")),
    address: z.string().trim().max(300).optional().or(z.literal("")),
    job_title: z.string().trim().max(100).optional().or(z.literal("")),
    id_number: z.string().trim().max(50).optional().or(z.literal("")),
    date_of_birth: z.string().optional().or(z.literal("")),
    start_date: z.string().optional().or(z.literal("")),
    emergency_contact_name: z
        .string()
        .trim()
        .max(100)
        .optional()
        .or(z.literal("")),
    emergency_contact_phone: z
        .string()
        .trim()
        .max(30)
        .optional()
        .or(z.literal("")),
    bio: z.string().trim().max(500).optional().or(z.literal("")),
})

type ProfileForm = z.infer<typeof profileSchema>

const empty: ProfileForm = {
    full_name: "",
    phone: "",
    address: "",
    job_title: "",
    id_number: "",
    date_of_birth: "",
    start_date: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    bio: "",
}

const Settings = () => {
    const { user, session, refreshOrganisation } = useAuth()
    const [form, setForm] = useState<ProfileForm>(empty)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!session?.user) return
        ;(async () => {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .single()
            if (error) toast.error("Failed to load profile")
            else if (data) {
                setForm({
                    full_name: data.full_name ?? "",
                    phone: data.phone ?? "",
                    address: data.address ?? "",
                    job_title: data.job_title ?? "",
                    id_number: data.id_number ?? "",
                    date_of_birth: data.date_of_birth ?? "",
                    start_date: data.start_date ?? "",
                    emergency_contact_name: data.emergency_contact_name ?? "",
                    emergency_contact_phone: data.emergency_contact_phone ?? "",
                    bio: data.bio ?? "",
                })
            }
            setLoading(false)
        })()
    }, [session])

    // Role-specific data
    const { data: myAttendance } = useQuery({
        queryKey: ["settings-my-attendance", session?.user?.id],
        enabled: !!session?.user,
        queryFn: async () => {
            const { data } = await supabase
                .from("attendance_records")
                .select("date, clock_in, clock_out, hours_worked, status")
                .eq("employee_id", session!.user.id)
                .order("date", { ascending: false })
                .limit(10)
            return data ?? []
        },
    })

    const { data: teamCount } = useQuery({
        queryKey: [
            "settings-team-count",
            user?.role,
            user?.site,
            user?.department,
        ],
        enabled: !!user && user.role !== "employee",
        queryFn: async () => {
            let q = supabase
                .from("profiles")
                .select("id", { count: "exact", head: true })
            if (user!.role === "supervisor" && user!.site)
                q = q.eq("site", user!.site)
            if (user!.role === "manager" && user!.department)
                q = q.eq("department", user!.department)
            const { count } = await q
            return count ?? 0
        },
    })

    const update =
        (k: keyof ProfileForm) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm((p) => ({ ...p, [k]: e.target.value }))

    const handleSave = async () => {
        const parsed = profileSchema.safeParse(form)
        if (!parsed.success) {
            toast.error(parsed.error.errors[0].message)
            return
        }
        if (!session?.user) return
        setSaving(true)
        const payload: Record<string, string | null> = {}
        for (const [k, v] of Object.entries(parsed.data)) {
            payload[k] = v === "" ? null : (v as string)
        }
        // eslint-disable-next-line ..typescript-eslint/no-explicit-any
        const { error } = await supabase
            .from("profiles")
            .update(payload as any)
            .eq("id", session.user.id)
        setSaving(false)
        if (error) toast.error(error.message)
        else {
            toast.success("Profile updated")
            refreshOrganisation()
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                    Settings
                </h1>
                <p className="text-sm text-muted-foreground">
                    Manage your profile and view your role-based information.
                </p>
            </div>

            <Tabs defaultValue="profile">
                <TabsList>
                    <TabsTrigger value="profile">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                    </TabsTrigger>
                    <TabsTrigger value="role">
                        <Shield className="h-4 w-4 mr-2" />
                        Role & Access
                    </TabsTrigger>
                    <TabsTrigger value="activity">
                        <Calendar className="h-4 w-4 mr-2" />
                        My Activity
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>
                                Information used across your employee profile.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Full Name *</Label>
                                <Input
                                    id="full_name"
                                    value={form.full_name}
                                    onChange={update("full_name")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    value={user?.email ?? ""}
                                    disabled
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={form.phone}
                                    onChange={update("phone")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="id_number">ID Number</Label>
                                <Input
                                    id="id_number"
                                    value={form.id_number}
                                    onChange={update("id_number")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date_of_birth">
                                    Date of Birth
                                </Label>
                                <Input
                                    id="date_of_birth"
                                    type="date"
                                    value={form.date_of_birth}
                                    onChange={update("date_of_birth")}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Address</Label>
                                <Textarea
                                    id="address"
                                    rows={2}
                                    value={form.address}
                                    onChange={update("address")}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Employment</CardTitle>
                            <CardDescription>
                                Your role at the company.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="job_title">Job Title</Label>
                                <Input
                                    id="job_title"
                                    value={form.job_title}
                                    onChange={update("job_title")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Start Date</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={form.start_date}
                                    onChange={update("start_date")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input
                                    value={user?.department ?? "—"}
                                    disabled
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Site</Label>
                                <Input value={user?.site ?? "—"} disabled />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="bio">Bio</Label>
                                <Textarea
                                    id="bio"
                                    rows={3}
                                    value={form.bio}
                                    onChange={update("bio")}
                                    placeholder="A short description about yourself"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Emergency Contact</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="ec_name">Contact Name</Label>
                                <Input
                                    id="ec_name"
                                    value={form.emergency_contact_name}
                                    onChange={update("emergency_contact_name")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="ec_phone">Contact Phone</Label>
                                <Input
                                    id="ec_phone"
                                    value={form.emergency_contact_phone}
                                    onChange={update("emergency_contact_phone")}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="role" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5" />
                                Your Access
                            </CardTitle>
                            <CardDescription>
                                What you can do based on your role.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Role:
                                </span>
                                <Badge variant="outline" className="capitalize">
                                    {user?.role}
                                </Badge>
                            </div>
                            {user?.role === "admin" && (
                                <ul className="text-sm space-y-1 list-disc pl-5 text-foreground">
                                    <li>
                                        Configure organisation, sites,
                                        departments, roles, shifts
                                    </li>
                                    <li>Invite and manage all employees</li>
                                    <li>
                                        View compliance reports and audit logs
                                    </li>
                                    <li>Export payroll data</li>
                                </ul>
                            )}
                            {user?.role === "manager" && (
                                <ul className="text-sm space-y-1 list-disc pl-5 text-foreground">
                                    <li>View attendance for your department</li>
                                    <li>
                                        Generate reports and verify attendance
                                    </li>
                                    <li>Export payroll for your team</li>
                                </ul>
                            )}
                            {user?.role === "supervisor" && (
                                <ul className="text-sm space-y-1 list-disc pl-5 text-foreground">
                                    <li>
                                        Monitor live attendance at your site
                                    </li>
                                    <li>Verify check-ins for your team</li>
                                </ul>
                            )}
                            {user?.role === "employee" && (
                                <ul className="text-sm space-y-1 list-disc pl-5 text-foreground">
                                    <li>
                                        Check in / out via QR, biometric, or
                                        WhatsApp
                                    </li>
                                    <li>View your own attendance history</li>
                                </ul>
                            )}
                            {teamCount !== undefined &&
                                user?.role !== "employee" && (
                                    <div className="pt-2 border-t border-border">
                                        <p className="text-sm">
                                            <span className="text-muted-foreground">
                                                Team members in scope:
                                            </span>{" "}
                                            <span className="font-semibold text-foreground">
                                                {teamCount}
                                            </span>
                                        </p>
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="activity" className="space-y-6 mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Attendance</CardTitle>
                            <CardDescription>
                                Your last 10 check-ins.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!myAttendance || myAttendance.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No attendance records yet.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {myAttendance.map((r, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
                                        >
                                            <span className="font-medium text-foreground">
                                                {r.date}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {r.clock_in
                                                    ? new Date(
                                                          r.clock_in
                                                      ).toLocaleTimeString([], {
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                      })
                                                    : "—"}
                                                {" → "}
                                                {r.clock_out
                                                    ? new Date(
                                                          r.clock_out
                                                      ).toLocaleTimeString([], {
                                                          hour: "2-digit",
                                                          minute: "2-digit",
                                                      })
                                                    : "—"}
                                            </span>
                                            <span className="font-mono text-xs">
                                                {r.hours_worked ?? 0}h
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="capitalize"
                                            >
                                                {r.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

export default Settings
