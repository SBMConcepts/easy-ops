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

		// Admin/Manager only
		const { data: roleData } = await supabase
			.from("user_roles")
			.select("role")
			.eq("user_id", userId)
			.single()

		if (!roleData || !["admin", "manager"].includes(roleData.role)) {
			return new Response(JSON.stringify({ error: "Forbidden" }), {
				status: 403,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		const url = new URL(req.url)
		const dateFrom = url.searchParams.get("date_from")
		const dateTo = url.searchParams.get("date_to")
		const format = url.searchParams.get("format") || "json"

		if (!dateFrom || !dateTo) {
			return new Response(
				JSON.stringify({ error: "date_from and date_to required" }),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			)
		}

		const { data: records, error } = await supabase
			.from("attendance_records")
			.select("*, profiles:employee_id(full_name, email, department)")
			.gte("date", dateFrom)
			.lte("date", dateTo)
			.order("date")

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		if (format === "csv") {
			const header =
				"Employee,Email,Department,Date,Clock In,Clock Out,Hours Worked,Overtime,Status,Method\n"
			const rows = (records || [])
				.map((r) => {
					const p = (r as any).profiles
					return [
						p?.full_name || "",
						p?.email || "",
						p?.department || "",
						r.date,
						r.clock_in || "",
						r.clock_out || "",
						r.hours_worked || 0,
						r.overtime || 0,
						r.status,
						r.method,
					].join(",")
				})
				.join("\n")

			return new Response(header + rows, {
				status: 200,
				headers: {
					...corsHeaders,
					"Content-Type": "text/csv",
					"Content-Disposition": `attachment; filename="payroll_${dateFrom}_${dateTo}.csv"`,
				},
			})
		}

		return new Response(JSON.stringify({ records }), {
			status: 200,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		})
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error"
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		})
	}
})
