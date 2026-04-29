import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4"

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
}

interface SiteInput {
	name: string
	address?: string
	latitude?: number
	longitude?: number
	geofence_radius_m?: number
}

interface DepartmentInput {
	name: string
	site_index: number // references index in sites array
}

interface RoleInput {
	name: string
	base_role: "admin" | "manager" | "supervisor" | "employee"
}

interface ShiftInput {
	name: string
	start_time: string
	end_time: string
	grace_period_minutes: number
	site_index: number
}

interface OnboardingPayload {
	company: {
		name: string
		industry?: string
		country: string
		logo_url?: string
	}
	sites: SiteInput[]
	departments: DepartmentInput[]
	roles: RoleInput[]
	shifts: ShiftInput[]
	settings: {
		check_in_methods: string[]
		geofencing_enabled: boolean
		default_geofence_radius: number
		max_weekly_hours: number
		overtime_multiplier: number
	}
}

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders })
	}

	try {
		const authHeader = req.headers.get("Authorization")
		if (!authHeader) {
			return new Response(JSON.stringify({ error: "Missing authorization" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		const supabaseAdmin = createClient(
			Deno.env.get("SUPABASE_URL")!,
			Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
		)

		const supabaseUser = createClient(
			Deno.env.get("SUPABASE_URL")!,
			Deno.env.get("SUPABASE_ANON_KEY")!,
			{ global: { headers: { Authorization: authHeader } } },
		)

		const {
			data: { user },
			error: authError,
		} = await supabaseUser.auth.getUser()
		if (authError || !user) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		// Verify admin role
		const { data: roleData } = await supabaseAdmin
			.from("user_roles")
			.select("role")
			.eq("user_id", user.id)
			.single()

		if (roleData?.role !== "admin") {
			return new Response(JSON.stringify({ error: "Admin access required" }), {
				status: 403,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			})
		}

		const payload: OnboardingPayload = await req.json()

		// Validate required fields
		if (!payload.company?.name || !payload.sites?.length) {
			return new Response(
				JSON.stringify({
					error: "Company name and at least one site are required",
				}),
				{
					status: 400,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			)
		}

		// 1. Create organisation
		const { data: org, error: orgError } = await supabaseAdmin
			.from("organisations")
			.insert({
				name: payload.company.name,
				industry: payload.company.industry || null,
				country: payload.company.country || "South Africa",
				logo_url: payload.company.logo_url || null,
				onboarding_completed: true,
				settings: payload.settings || {},
				created_by: user.id,
			})
			.select("id")
			.single()

		if (orgError || !org) {
			return new Response(
				JSON.stringify({
					error: "Failed to create organisation",
					details: orgError?.message,
				}),
				{
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			)
		}

		const orgId = org.id

		// 2. Insert sites
		const sitesPayload = payload.sites.map((s) => ({
			name: s.name,
			address: s.address || null,
			latitude: s.latitude || null,
			longitude: s.longitude || null,
			geofence_radius_m:
				s.geofence_radius_m || payload.settings?.default_geofence_radius || 200,
			organisation_id: orgId,
		}))

		const { data: insertedSites, error: sitesError } = await supabaseAdmin
			.from("sites")
			.insert(sitesPayload)
			.select("id")

		if (sitesError) {
			return new Response(
				JSON.stringify({
					error: "Failed to create sites",
					details: sitesError.message,
				}),
				{
					status: 500,
					headers: { ...corsHeaders, "Content-Type": "application/json" },
				},
			)
		}

		// 3. Insert departments
		if (payload.departments?.length) {
			const deptsPayload = payload.departments.map((d) => ({
				name: d.name,
				site_id: insertedSites?.[d.site_index]?.id || null,
				organisation_id: orgId,
			}))

			const { error: deptsError } = await supabaseAdmin
				.from("departments")
				.insert(deptsPayload)
			if (deptsError) {
				console.error("Departments error:", deptsError)
			}
		}

		// 4. Insert shifts
		if (payload.shifts?.length) {
			const shiftsPayload = payload.shifts.map((s) => ({
				name: s.name,
				start_time: s.start_time,
				end_time: s.end_time,
				grace_period_minutes: s.grace_period_minutes || 15,
				site_id: insertedSites?.[s.site_index]?.id || null,
				organisation_id: orgId,
			}))

			const { error: shiftsError } = await supabaseAdmin
				.from("shifts")
				.insert(shiftsPayload)
			if (shiftsError) {
				console.error("Shifts error:", shiftsError)
			}
		}

		// 5. Insert organisation roles
		if (payload.roles?.length) {
			const rolesPayload = payload.roles.map((r) => ({
				name: r.name,
				base_role: r.base_role,
				organisation_id: orgId,
			}))

			const { error: rolesError } = await supabaseAdmin
				.from("organisation_roles")
				.insert(rolesPayload)
			if (rolesError) {
				console.error("Roles error:", rolesError)
			}
		}

		// 6. Update admin's profile with organisation_id
		await supabaseAdmin
			.from("profiles")
			.update({ organisation_id: orgId })
			.eq("id", user.id)

		// 7. Audit log
		await supabaseAdmin.from("audit_log").insert({
			user_id: user.id,
			action: "organisation_setup_completed",
			target_table: "organisations",
			target_id: orgId,
			details: {
				company_name: payload.company.name,
				sites_count: payload.sites.length,
			},
		})

		return new Response(
			JSON.stringify({ success: true, organisation_id: orgId }),
			{
				status: 200,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		)
	} catch (err) {
		return new Response(
			JSON.stringify({ error: "Internal server error", details: String(err) }),
			{
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		)
	}
})
