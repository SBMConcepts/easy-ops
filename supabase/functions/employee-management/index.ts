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

		// Check role — only admin/manager
		const { data: roleData } = await supabase
			.from("user_roles")
			.select("role")
			.eq("user_id", userId)
			.single()

		const role = roleData?.role

		if (req.method === "GET") {
			// List employees (profiles + roles)
			const { data: profiles, error } = await supabase
				.from("profiles")
				.select("*, user_roles(role)")
				.order("full_name")

			if (error) {
				return new Response(JSON.stringify({ error: error.message }), {
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				})
			}

			return new Response(JSON.stringify({ employees: profiles }), {
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		// POST/PUT/DELETE require admin
		if (role !== "admin") {
			return new Response(JSON.stringify({ error: "Forbidden — admin only" }), {
				status: 403,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		if (req.method === "PUT") {
			const body = await req.json()
			const { user_id, full_name, department, site, role: newRole } = body

			if (!user_id) {
				return new Response(JSON.stringify({ error: "user_id is required" }), {
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				})
			}

			// Update profile
			const updates: Record<string, string> = {}
			if (full_name) updates.full_name = full_name
			if (department) updates.department = department
			if (site) updates.site = site

			if (Object.keys(updates).length > 0) {
				const { error: profileError } = await supabase
					.from("profiles")
					.update(updates)
					.eq("id", user_id)
				if (profileError) {
					return new Response(JSON.stringify({ error: profileError.message }), {
						status: 500,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					})
				}
			}

			// Update role if provided
			if (
				newRole &&
				["admin", "manager", "supervisor", "employee"].includes(newRole)
			) {
				// Delete old role then insert new
				await supabase.from("user_roles").delete().eq("user_id", user_id)
				const { error: roleError } = await supabase
					.from("user_roles")
					.insert({ user_id, role: newRole })
				if (roleError) {
					return new Response(JSON.stringify({ error: roleError.message }), {
						status: 500,
						headers: { ...corsHeaders, "Content-Type": "application/json" },
					})
				}
			}

			// Audit
			await supabase.from("audit_log").insert({
				user_id: userId,
				action: "update_employee",
				target_table: "profiles",
				target_id: user_id,
				details: { updates, newRole },
			})

			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
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
