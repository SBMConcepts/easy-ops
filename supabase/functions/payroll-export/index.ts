<<<<<<< Updated upstream
import { createClient } from "npm:@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"
=======
/* eslint-disable @typescript-eslint/no-explicit-any */
import { corsHeaders } from '../_shared/cors.ts'
import { resolveAuthContext, requireRole } from '../_shared/auth-middleware.ts'
>>>>>>> Stashed changes

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
}

function isValidDate(v: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v).getTime())
}

/** Wrap a CSV cell value in quotes if it contains commas, quotes or newlines. */
function csvCell(value: unknown): string {
    const str = value == null ? "" : String(value)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS")
        return new Response("ok", { headers: corsHeaders })
    if (req.method !== "GET")
        return jsonResponse({ error: "Method not allowed" }, 405)

    try {
        const authHeader = req.headers.get("Authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return jsonResponse(
                { error: "Missing or invalid authorization header" },
                401
            )
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )
        const supabaseUser = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: authHeader } } }
        )

        const {
            data: { user },
            error: authError,
        } = await supabaseUser.auth.getUser()
        if (authError || !user)
            return jsonResponse({ error: "Unauthorized" }, 401)

        // ── Role + organisation (parallel) ──────────────────────────────────
        const [roleRes, profileRes] = await Promise.all([
            supabaseAdmin
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .single(),
            supabaseAdmin
                .from("profiles")
                .select("organisation_id")
                .eq("id", user.id)
                .single(),
        ])

        if (
            !roleRes.data ||
            !["admin", "manager"].includes(roleRes.data.role)
        ) {
            return jsonResponse(
                { error: "Forbidden: admin or manager role required" },
                403
            )
        }

        const organisationId = profileRes.data?.organisation_id
        if (!organisationId) {
            return jsonResponse(
                {
                    error: "User has no organisation. Complete onboarding first.",
                },
                403
            )
        }

        // ── Validate params ──────────────────────────────────────────────────
        const url = new URL(req.url)
        const dateFrom = url.searchParams.get("date_from")
        const dateTo = url.searchParams.get("date_to")
        const format = url.searchParams.get("format") || "json"

        if (!dateFrom || !dateTo) {
            return jsonResponse(
                { error: "date_from and date_to are required" },
                400
            )
        }
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
        const diffDays =
            (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) /
            (1000 * 60 * 60 * 24)
        if (diffDays > 366) {
            return jsonResponse(
                { error: "Date range exceeds maximum of 366 days" },
                400
            )
        }
        if (!["json", "csv"].includes(format)) {
            return jsonResponse(
                { error: "format must be 'json' or 'csv'" },
                400
            )
        }

        // ── Scope to organisation's sites ────────────────────────────────────
        const { data: orgSites } = await supabaseAdmin
            .from("sites")
            .select("id")
            .eq("organisation_id", organisationId)

        const orgSiteIds = (orgSites ?? []).map((s: any) => s.id)

        if (!orgSiteIds.length) {
            if (format === "csv") {
                return new Response(
                    "Employee,Email,Department,Date,Clock In,Clock Out,Hours Worked,Overtime,Status,Method\n",
                    {
                        status: 200,
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "text/csv",
                            "Content-Disposition": `attachment; filename="payroll_${dateFrom}_${dateTo}.csv"`,
                        },
                    }
                )
            }
            return jsonResponse({ records: [] })
        }

        // ── Fetch records (no cross-schema join) ─────────────────────────────
        const { data: records, error: recordsError } = await supabaseAdmin
            .from("attendance_records")
            .select(
                "id, employee_id, date, clock_in, clock_out, hours_worked, overtime, status, method"
            )
            .in("site_id", orgSiteIds)
            .gte("date", dateFrom)
            .lte("date", dateTo)
            .order("date")

        if (recordsError) {
            console.error("payroll-export records error:", recordsError)
            return jsonResponse(
                {
                    error: "Failed to fetch attendance records",
                    details: recordsError.message,
                },
                500
            )
        }

        // ── Enrich with profile data (separate query) ────────────────────────
        const employeeIds = [
            ...new Set(
                (records ?? []).map((r: any) => r.employee_id as string)
            ),
        ]
        const profileMap: Record<
            string,
            { full_name: string; email: string; department: string | null }
        > = {}

        if (employeeIds.length) {
            const { data: profiles } = await supabaseAdmin
                .from("profiles")
                .select("id, full_name, email, department")
                .in("id", employeeIds)

            for (const p of profiles ?? []) {
                profileMap[p.id] = {
                    full_name: p.full_name,
                    email: p.email,
                    department: p.department,
                }
            }
        }

        if (format === "csv") {
            const header =
                "Employee,Email,Department,Date,Clock In,Clock Out,Hours Worked,Overtime,Status,Method\n"
            const rows = (records ?? [])
                .map((r: any) => {
                    const p = profileMap[r.employee_id]
                    return [
                        csvCell(p?.full_name),
                        csvCell(p?.email),
                        csvCell(p?.department),
                        csvCell(r.date),
                        csvCell(r.clock_in),
                        csvCell(r.clock_out),
                        csvCell(r.hours_worked ?? 0),
                        csvCell(r.overtime ?? 0),
                        csvCell(r.status),
                        csvCell(r.method),
                    ].join(",")
                })
                .join("\n")

            // Sanitise filename to prevent Content-Disposition header injection
            const safeFrom = dateFrom.replace(/[^0-9-]/g, "")
            const safeTo = dateTo.replace(/[^0-9-]/g, "")

            return new Response(header + rows, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="payroll_${safeFrom}_${safeTo}.csv"`,
                },
            })
        }

        const enriched = (records ?? []).map((r: any) => ({
            ...r,
            profile: profileMap[r.employee_id] ?? null,
        }))

        return jsonResponse({ records: enriched })
    } catch (err) {
        console.error("payroll-export unhandled error:", err)
        return jsonResponse(
            { error: "Internal server error", details: String(err) },
            500
        )
    }
})
