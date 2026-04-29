import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { method, site_id, latitude, longitude, notes } = body;

    if (!method || !["qr", "biometric", "whatsapp", "manual"].includes(method)) {
      return new Response(JSON.stringify({ error: "Invalid check-in method" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if already clocked in today
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("employee_id", userId)
      .eq("date", today)
      .is("clock_out", null)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Already clocked in today. Please clock out first." }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Determine if late based on shift (default 08:00 + 15 min grace)
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 8 || (hours === 8 && minutes > 15);

    const { data: record, error: insertError } = await supabase
      .from("attendance_records")
      .insert({
        employee_id: userId,
        date: today,
        clock_in: now.toISOString(),
        method,
        status: isLate ? "late" : "present",
        site_id: site_id || null,
        latitude: latitude || null,
        longitude: longitude || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Audit log
    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "check_in",
      target_table: "attendance_records",
      target_id: record.id,
      details: { method, site_id, status: record.status },
    });

    return new Response(JSON.stringify({ success: true, record }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
