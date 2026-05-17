import { NextResponse } from "next/server";
import { javaGet } from "@/lib/java-backend";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ApiStatus } from "@/types/coach";

export const runtime = "nodejs";

export async function GET() {
  const javaStatus = await javaGet<
    Pick<ApiStatus, "demoMode" | "openaiConfigured" | "googleConfigured" | "speechConfigured" | "sttProvider" | "sttModel">
  >("/api/status");
  const supabaseConfigured = hasSupabaseConfig();
  const supabase = await createClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return NextResponse.json({
    ...javaStatus,
    supabaseConfigured,
    authenticated: Boolean(user),
    userEmail: user?.email ?? null
  });
}
