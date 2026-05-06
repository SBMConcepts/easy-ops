import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

// ── helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
}

/** Returns true if the string is a valid YYYY-MM-DD date. */
function isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const d = new Date(value)
    return !isNaN(d.getTime())
}

/** Returns true if the string looks like a UUID v4. */
function isValidUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value
    )
}

// ── handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    if (req.method !== "GET") {
        return jsonResponse({ error: "Method not allowed" }, 405)
    }

    try {
        // ── 1. Auth ──────────────────────────────────────────────────────────
        const authHeader = req.headers.get("Authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return jsonResponse(
                { error: "Missing or invalid authorization header" },
                401
            )
        }

        const supabaseUser = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        const {
            data: { user },
            error: userError,
        } = await supabaseUser.auth.getUser()
        if (userError || !user) {
            return jsonResponse({ error: "Unauthorized" }, 401)
        }

        // ── 2. Role check — only admin / manager may view full reports ────────
        const { data: roleRow, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single()

        if (roleError || !roleRow) {
            return jsonResponse({ error: "Could not resolve user role" }, 403)
        }

        const allowedRoles = ["admin", "manager", "supervisor"]
        if (!allowedRoles.includes(roleRow.role)) {
            return jsonResponse(
                {
                    error: "Forbidden: insufficient role to access attendance reports",
                },
                403
            )
        }

        // ── 3. Scoping — resolve the user's organisation ─────────────────────
        const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles")
            .select("organisation_id")
            .eq("id", user.id)
            .single()

        if (profileError || !profile?.organisation_id) {
            return jsonResponse(
                {
                    error: "User has no organisation. Complete onboarding first.",
                },
                403
            )
        }

        const organisationId: string = profile.organisation_id

        // ── 4. Query parameter validation ─────────────────────────────────────
        const today = new Date().toISOString().split("T")[0]
        const url = new URL(req.url)

        const dateFrom = url.searchParams.get("date_from") || today
        const dateTo = url.searchParams.get("date_to") || today
        const siteId = url.searchParams.get("site_id")
        const pageParam = url.searchParams.get("page")
        const limitParam = url.searchParams.get("limit")

        if (!isValidDate(dateFrom)) {
            return jsonResponse(
                { error: "Invalid date_from. Expected format: YYYY-MM-DD" },
                400
            )
        }
        if (!isValidDate(dateTo)) {
            return jsonResponse(
                { error: "Invalid date_to. Expected format: YYYY-MM-DD" },
                400
            )
        }
        if (new Date(dateFrom) > new Date(dateTo)) {
            return jsonResponse(
                { error: "date_from must not be after date_to" },
                400
            )
        }

        // Prevent runaway range queries (max 366 days)
        const diffDays =
            (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) /
            (1000 * 60 * 60 * 24)
        if (diffDays > 366) {
            return jsonResponse(
                { error: "Date range exceeds maximum of 366 days" },
                400
            )
        }

        if (siteId && !isValidUUID(siteId)) {
            return jsonResponse({ error: "Invalid site_id format" }, 400)
        }

        const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
        const limit = Math.min(
            500,
            Math.max(1, parseInt(limitParam ?? "100", 10) || 100)
        )
        const from = (page - 1) * limit
        const to = from + limit - 1

        // ── 5. If siteId provided, verify it belongs to this organisation ──────
        if (siteId) {
            const { data: siteRow, error: siteError } = await supabaseAdmin
                .from("sites")
                .select("id")
                .eq("id", siteId)
                .eq("organisation_id", organisationId)
                .single()

            if (siteError || !siteRow) {
                return jsonResponse(
                    {
                        error: "site_id not found or does not belong to your organisation",
                    },
                    404
                )
            }
        }

        // ── 6a. Fetch org's site IDs for scoping ──────────────────────────────
        const { data: orgSites, error: orgSitesError } = await supabaseAdmin
            .from("sites")
            .select("id, name")
            .eq("organisation_id", organisationId)

        if (orgSitesError) {
            console.error("sites query error:", orgSitesError)
            return jsonResponse(
                {
                    error: "Failed to resolve organisation sites",
                    details: orgSitesError.message,
                },
                500
            )
        }

        const orgSiteIds = (orgSites ?? []).map((s: any) => s.id)
        const siteNameMap = Object.fromEntries(
            (orgSites ?? []).map((s: any) => [s.id, s.name])
        )

        if (!orgSiteIds.length) {
            return jsonResponse({
                records: [],
                stats: {
                    present: 0,
                    late: 0,
                    absent: 0,
                    on_leave: 0,
                    total_hours: 0,
                    total_overtime: 0,
                    total: 0,
                },
                pagination: { page, limit, total: 0, pages: 0 },
            })
        }

        // ── 6b. Fetch attendance records scoped to this organisation's sites ───
        let query = supabaseAdmin
            .from("attendance_records")
            .select(
                "id, date, clock_in, clock_out, method, status, hours_worked, overtime, notes, employee_id, site_id",
                { count: "exact" }
            )
            .in("site_id", siteId ? [siteId] : orgSiteIds)
            .gte("date", dateFrom)
            .lte("date", dateTo)
            .order("date", { ascending: false })
            .order("clock_in", { ascending: false })
            .range(from, to)

        const { data: records, error: recordsError, count } = await query

        if (recordsError) {
            console.error("attendance_records query error:", recordsError)
            return jsonResponse(
                {
                    error: "Failed to fetch attendance records",
                    details: recordsError.message,
                },
                500
            )
        }

        const scoped = records ?? []

        // ── 6c. Enrich with profile data via a separate query ─────────────────
        const employeeIds = [
            ...new Set(scoped.map((r: any) => r.employee_id as string)),
        ]
        const profileMap: Record<
            string,
            {
                full_name: string
                department: string | null
                site: string | null
            }
        > = {}

        if (employeeIds.length) {
            const { data: profiles } = await supabaseAdmin
                .from("profiles")
                .select("id, full_name, department, site")
                .in("id", employeeIds)

            for (const p of profiles ?? []) {
                profileMap[p.id] = {
                    full_name: p.full_name,
                    department: p.department,
                    site: p.site,
                }
            }
        }

        // ── 7. Aggregate stats ─────────────────────────────────────────────────
        const stats = {
            present: scoped.filter((r: any) => r.status === "present").length,
            late: scoped.filter((r: any) => r.status === "late").length,
            absent: scoped.filter((r: any) => r.status === "absent").length,
            on_leave: scoped.filter((r: any) => r.status === "on_leave").length,
            total_hours: parseFloat(
                scoped
                    .reduce((s: number, r: any) => s + (r.hours_worked || 0), 0)
                    .toFixed(2)
            ),
            total_overtime: parseFloat(
                scoped
                    .reduce((s: number, r: any) => s + (r.overtime || 0), 0)
                    .toFixed(2)
            ),
            total: scoped.length,
        }

        // Merge profile + site name into each record
        const sanitised = scoped.map((r: any) => ({
            id: r.id,
            date: r.date,
            clock_in: r.clock_in,
            clock_out: r.clock_out,
            method: r.method,
            status: r.status,
            hours_worked: r.hours_worked,
            overtime: r.overtime,
            notes: r.notes,
            employee_id: r.employee_id,
            site_id: r.site_id,
            profiles: profileMap[r.employee_id] ?? null,
            sites: r.site_id ? { name: siteNameMap[r.site_id] ?? null } : null,
        }))

        return jsonResponse({
            records: sanitised,
            stats,
            pagination: {
                page,
                limit,
                total: count ?? scoped.length,
                pages: Math.ceil((count ?? scoped.length) / limit),
            },
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error"
        console.error("attendance-report unhandled error:", err)
        return jsonResponse(
            { error: "Internal server error", details: message },
            500
        )
    }
})
