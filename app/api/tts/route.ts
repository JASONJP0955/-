import { NextResponse } from "next/server";
import { javaPostJson } from "@/lib/java-backend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Missing text." }, { status: 400 });
  }

  return NextResponse.json(await javaPostJson("/api/tts", { text }));
}
