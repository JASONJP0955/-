import { NextResponse } from "next/server";
import { hasOpenAIKey } from "@/lib/openai";

export const runtime = "nodejs";

export async function GET() {
  const sttProvider = process.env.STT_PROVIDER === "google" ? "google" : "openai";
  const openaiConfigured = hasOpenAIKey();
  const googleConfigured = Boolean(process.env.GOOGLE_SPEECH_ACCESS_TOKEN || process.env.GOOGLE_SPEECH_API_KEY);
  const speechConfigured = sttProvider === "google" ? googleConfigured : openaiConfigured;
  const appConfigured = openaiConfigured && speechConfigured;

  return NextResponse.json({
    demoMode: !appConfigured,
    openaiConfigured,
    googleConfigured,
    speechConfigured,
    sttProvider,
    sttModel:
      sttProvider === "google"
        ? process.env.GOOGLE_SPEECH_MODEL ?? "latest_short"
        : process.env.OPENAI_STT_MODEL ?? "gpt-4o-transcribe"
  });
}
