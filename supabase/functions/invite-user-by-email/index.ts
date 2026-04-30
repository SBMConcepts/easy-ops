import { createClient } from "@supabase/supabase-js"

type Role = "admin" | "manager" | "supervisor" | "employee"

type InvitePayload = {
    email: string
    full_name?: string
    role: Role
    department?: string | null
    site?: string | null
}

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })

Deno.serve(async (req: Request) => {
    if (req.method !== "POST") {
        return json(405, { error: "Method Not Allowed" })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !serviceRoleKey) {
        return json(500, {
            error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        })
    }

    const body = (await req.json()) as InvitePayload
    if (!body?.email || !body?.role) {
        return json(400, { error: "Missing required fields: email, role" })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
    })

    // 1) Call your existing RPC: inviteUserByEmail
    // Expected return: { user_id: uuid, email: string, ... } (adjust if your RPC returns different shape).
    const { data: inviteData, error: inviteError } = await supabase.rpc(
        "inviteUserByEmail",
        {
            p_email: body.email,
        }
    )

    if (inviteError) {
        return json(500, {
            error: "inviteUserByEmail failed",
            details: inviteError.message,
        })
    }

    const userId: string | undefined =
        (inviteData as any)?.user_id ??
        (inviteData as any)?.id ??
        (inviteData as any)?.userId

    if (!userId) {
        return json(500, {
            error: "inviteUserByEmail returned no user id",
            inviteData,
        })
    }

    // 2) Insert/update profiles row
    const profileUpsert = {
        id: userId,
        email: body.email,
        full_name: body.full_name ?? "",
        department: body.department ?? null,
        site: body.site ?? null,
        updated_at: new Date().toISOString(),
    }

    const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileUpsert, { onConflict: "id" })

    if (profileError) {
        return json(500, {
            error: "Failed to upsert profiles",
            details: profileError.message,
        })
    }

    // 3) Insert user_roles row
    // The table PK is `id`, so we upsert using (user_id, role) if a unique constraint exists.
    // If you don't have a unique constraint, this will still prevent duplicates only if your DB enforces it.
    const roleRow = {
        user_id: userId,
        role: body.role,
    }

    // Try upsert first (works only if you have a unique index you can target).
    const { error: roleUpsertError } = await supabase
        .from("user_roles")
        .upsert(roleRow, { onConflict: "user_id" })

    if (roleUpsertError) {
        // Fallback to plain insert to keep the function useful even without unique constraints.
        const { error: roleInsertError } = await supabase
            .from("user_roles")
            .insert(roleRow)

        if (roleInsertError) {
            return json(500, {
                error: "Failed to insert user_roles",
                details: roleInsertError.message,
            })
        }
    }

    return json(200, {
        ok: true,
        user_id: userId,
        inviteData,
        assigned_role: body.role,
    })
})
