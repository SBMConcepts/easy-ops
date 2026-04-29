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

    const today = new Date().toISOString().split("T")[0];

    // Find today's open record
    const { data: record, error: fetchError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("employee_id", userId)
      .eq("date", today)
      .is("clock_out", null)
      .maybeSingle();

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!record) {
      return new Response(JSON.stringify({ error: "No open check-in found for today." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const now = new Date();
    const clockIn = new Date(record.clock_in);
    const diffMs = now.getTime() - clockIn.getTime();
    const hoursWorked = Math.round((diffMs / 3600000) * 100) / 100;
    const overtime = Math.max(0, Math.round((hoursWorked - 8) * 100) / 100);

    const { data: updated, error: updateError } = await supabase
      .from("attendance_records")
      .update({
        clock_out: now.toISOString(),
        hours_worked: hoursWorked,
        overtime,
      })
      .eq("id", record.id)
      .select()
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Audit log
    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "check_out",
      target_table: "attendance_records",
      target_id: record.id,
      details: { hours_worked: hoursWorked, overtime },
    });

    return new Response(JSON.stringify({ success: true, record: updated }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
