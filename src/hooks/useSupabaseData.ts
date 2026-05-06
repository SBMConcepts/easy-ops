import { useQuery } from "@tanstack/react-query"
import { supabase } from "../integrations/supabase/client"
import { useAuth } from "../contexts/AuthContext"

export function useAttendanceRecords(dateFrom?: string, dateTo?: string) {
    const { session } = useAuth()
    return useQuery({
        queryKey: ["attendance-records", dateFrom, dateTo],
        queryFn: async () => {
            const today = new Date().toISOString().split("T")[0]
            const params: Record<string, string> = {
                date_from: dateFrom || today,
                date_to: dateTo || today,
            }
            const qs = new URLSearchParams(params).toString()
            const { data, error } = await supabase.functions.invoke(
                `attendance-report?${qs}`,
                { method: "GET" }
            )
            if (error) throw error
            return data as {
                records: any[]
                stats: {
                    present: number
                    late: number
                    absent: number
                    on_leave: number
                    total_hours: number
                    total_overtime: number
                    total: number
                }
            }
        },
        enabled: !!session,
    })
}

export function useMyAttendance() {
    const { session } = useAuth()
    return useQuery({
        queryKey: ["my-attendance"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("attendance_records")
                .select("*")
                .order("date", { ascending: false })
                .limit(10)
            if (error) throw error
            return data
        },
        enabled: !!session,
    })
}

export function useTodayStatus() {
    const { session } = useAuth()
    return useQuery({
        queryKey: ["today-status"],
        queryFn: async () => {
            const today = new Date().toISOString().split("T")[0]
            const { data, error } = await supabase
                .from("attendance_records")
                .select("*")
                .eq("date", today)
                .is("clock_out", null)
                .maybeSingle()
            if (error) throw error
            return data
        },
        enabled: !!session,
        refetchInterval: 30000,
    })
}

export function useEmployees() {
    const { session } = useAuth()
    return useQuery({
        queryKey: ["employees"],
        queryFn: async () => {
            const { data: profiles, error } = await supabase
                .from("profiles")
                .select("*")
                .order("full_name")
            if (error) throw error

            const userIds = (profiles ?? []).map((p) => p.id)
            const { data: roles } = userIds.length
                ? await supabase
                      .from("user_roles")
                      .select("user_id, role")
                      .in("user_id", userIds)
                : { data: [] }

            const roleMap = Object.fromEntries(
                (roles ?? []).map((r) => [r.user_id, r.role])
            )
            return (profiles ?? []).map((p) => ({
                ...p,
                user_roles: roleMap[p.id] ? [{ role: roleMap[p.id] }] : [],
            }))
        },
        enabled: !!session,
    })
}

export function useSites() {
    const { session } = useAuth()
    return useQuery({
        queryKey: ["sites"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sites")
                .select("*")
                .order("name")
            if (error) throw error
            return data
        },
        enabled: !!session,
    })
}

export function useComplianceCheck() {
    const { session } = useAuth()
    return useQuery({
        queryKey: ["compliance-check"],
        queryFn: async () => {
            const { data, error } = await supabase.functions.invoke(
                "compliance-check",
                { method: "GET" }
            )
            if (error) throw error
            return data as {
                compliance_score: number
                total_checks: number
                pass_count: number
                violations: Array<{
                    employee_id: string
                    name: string
                    rule: string
                    detail: string
                }>
            }
        },
        enabled: !!session,
    })
}

export async function checkIn(
    method: string,
    siteId?: string,
    latitude?: number,
    longitude?: number
) {
    const { data, error } = await supabase.functions.invoke("check-in", {
        body: { method, site_id: siteId, latitude, longitude },
    })
    if (error) throw error
    return data
}

export async function checkOut() {
    const { data, error } = await supabase.functions.invoke("check-out", {
        body: {},
    })
    if (error) throw error
    return data
}
