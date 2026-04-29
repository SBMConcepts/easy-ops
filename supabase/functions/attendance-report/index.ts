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

		const url = new URL(req.url)
		const dateFrom =
			url.searchParams.get("date_from") ||
			new Date().toISOString().split("T")[0]
		const dateTo =
			url.searchParams.get("date_to") || new Date().toISOString().split("T")[0]
		const siteId = url.searchParams.get("site_id")

		let query = supabase
			.from("attendance_records")
			.select(
				"*, profiles:employee_id(full_name, department, site), sites:site_id(name)",
			)
			.gte("date", dateFrom)
			.lte("date", dateTo)
			.order("date", { ascending: false })

		if (siteId) {
			query = query.eq("site_id", siteId)
		}

		const { data: records, error } = await query

		if (error) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		// Aggregate stats
		const present = records?.filter((r) => r.status === "present").length || 0
		const late = records?.filter((r) => r.status === "late").length || 0
		const absent = records?.filter((r) => r.status === "absent").length || 0
		const onLeave = records?.filter((r) => r.status === "on_leave").length || 0
		const totalHours =
			records?.reduce((s, r) => s + (r.hours_worked || 0), 0) || 0
		const totalOvertime =
			records?.reduce((s, r) => s + (r.overtime || 0), 0) || 0

		return new Response(
			JSON.stringify({
				records,
				stats: {
					present,
					late,
					absent,
					on_leave: onLeave,
					total_hours: totalHours,
					total_overtime: totalOvertime,
					total: records?.length || 0,
				},
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
