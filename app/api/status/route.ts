import { NextResponse } from "next/server";
import { hasOpenAIKey } from "@/lib/openai";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const sttProvider = process.env.STT_PROVIDER?.trim() === "google" ? "google" : "openai";
  const openaiConfigured = hasOpenAIKey();
  const googleConfigured = Boolean(process.env.GOOGLE_SPEECH_ACCESS_TOKEN || process.env.GOOGLE_SPEECH_API_KEY);
  const speechConfigured = sttProvider === "google" ? googleConfigured : openaiConfigured;
  const appConfigured = openaiConfigured && speechConfigured;
  const supabaseConfigured = hasSupabaseConfig();
  const supabase = await createClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  return NextResponse.json({
    demoMode: !appConfigured,
    openaiConfigured,
    googleConfigured,
    speechConfigured,
    supabaseConfigured,
    authenticated: Boolean(user),
    userEmail: user?.email ?? null,
    sttProvider,
    sttModel:
      sttProvider === "google"
        ? process.env.GOOGLE_SPEECH_MODEL?.trim() || "latest_short"
        : process.env.OPENAI_STT_MODEL?.trim() || "gpt-4o-transcribe"
  });
}
