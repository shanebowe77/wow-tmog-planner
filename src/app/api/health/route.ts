import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Liveness + Supabase reachability. `supabase` is one of:
 * "ok" (health() RPC answered), "unconfigured" (no env vars yet),
 * or "error" (env set but the query failed).
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ status: "ok", supabase: "unconfigured" });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("health");

  if (error || data !== "ok") {
    return NextResponse.json(
      { status: "ok", supabase: "error", detail: error?.message ?? data },
      { status: 503 },
    );
  }

  return NextResponse.json({ status: "ok", supabase: "ok" });
}
