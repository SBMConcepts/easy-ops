import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0"
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors"

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders })
	}

	try {
		const authHeader = req.headers.get("Authorization")
		if (!authHeader?.startsWith("Bearer ")) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		const supabase = createClient(
			Deno.env.get("SUPABASE_URL")!,
			Deno.env.get("SUPABASE_ANON_KEY")!,
			{ global: { headers: { Authorization: authHeader } } },
		)

		const token = authHeader.replace("Bearer ", "")
		const { data: claimsData, error: claimsError } =
			await supabase.auth.getClaims(token)
		if (claimsError || !claimsData?.claims) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}
		const userId = claimsData.claims.sub

		// Admin only
		const { data: roleData } = await supabase
			.from("user_roles")
			.select("role")
			.eq("user_id", userId)
			.single()

		if (roleData?.role !== "admin") {
			return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
				status: 403,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		// Get all attendance records and check BCEA rules
		const url = new URL(req.url)
		const weekStart = url.searchParams.get("week_start") || getWeekStart()

		const weekEnd = new Date(weekStart)
		weekEnd.setDate(weekEnd.getDate() + 6)

		const { data: records, error } = await supabase
			.from("attendance_records")
			.select("*, profiles:employee_id(full_name)")
			.gte("date", weekStart)
			.lte("date", weekEnd.toISOString().split("T")[0])

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		// Group by employee
		const byEmployee: Record<
			string,
			{ name: string; totalHours: number; totalOvertime: number; days: number }
		> = {}
		for (const r of records || []) {
			const eid = r.employee_id
			if (!byEmployee[eid]) {
				const name = (r as any).profiles?.full_name || "Unknown"
				byEmployee[eid] = { name, totalHours: 0, totalOvertime: 0, days: 0 }
			}
			byEmployee[eid].totalHours += r.hours_worked || 0
			byEmployee[eid].totalOvertime += r.overtime || 0
			byEmployee[eid].days += 1
		}

		const violations: Array<{
			employee_id: string
			name: string
			rule: string
			detail: string
		}> = []
		let passCount = 0
		const totalChecks = Object.keys(byEmployee).length * 3 // 3 rules per employee

		for (const [eid, data] of Object.entries(byEmployee)) {
			// BCEA: max 45 hours/week
			if (data.totalHours > 45) {
				violations.push({
					employee_id: eid,
					name: data.name,
					rule: "BCEA Max Weekly Hours",
					detail: `${data.totalHours.toFixed(1)}h exceeds 45h limit`,
				})
			} else {
				passCount++
			}

			// BCEA: max 10 hours overtime/week
			if (data.totalOvertime > 10) {
				violations.push({
					employee_id: eid,
					name: data.name,
					rule: "BCEA Overtime Cap",
					detail: `${data.totalOvertime.toFixed(1)}h overtime exceeds 10h limit`,
				})
			} else {
				passCount++
			}

			// Max 6 consecutive days
			if (data.days > 6) {
				violations.push({
					employee_id: eid,
					name: data.name,
					rule: "BCEA Rest Period",
					detail: `${data.days} consecutive days worked without rest`,
				})
			} else {
				passCount++
			}
		}

		const complianceScore =
			totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 100

		return new Response(
			JSON.stringify({
				compliance_score: complianceScore,
				total_checks: totalChecks,
				pass_count: passCount,
				violations,
				week_start: weekStart,
			}),
			{
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		)
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error"
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		})
	}
})

function getWeekStart(): string {
	const now = new Date()
	const day = now.getDay()
	const diff = now.getDate() - day + (day === 0 ? -6 : 1)
	const monday = new Date(now.setDate(diff))
	return monday.toISOString().split("T")[0]
}
