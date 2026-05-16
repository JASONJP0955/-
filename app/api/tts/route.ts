import { NextResponse } from "next/server";
import { hasOpenAIKey, synthesizeJapanese } from "@/lib/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Missing text." }, { status: 400 });
  }

  if (!hasOpenAIKey()) {
    return NextResponse.json({ audioBase64: undefined, demoMode: true });
  }

  return NextResponse.json({
    audioBase64: await synthesizeJapanese(text),
    demoMode: false
  });
}
