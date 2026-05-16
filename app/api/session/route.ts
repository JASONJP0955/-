import { NextResponse } from "next/server";
import { createSessionStarter } from "@/lib/coach";
import { hasOpenAIKey, synthesizeJapanese } from "@/lib/openai";
import type { Difficulty, SessionStart } from "@/types/coach";

export const runtime = "nodejs";

function isDifficulty(value: unknown): value is Difficulty {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const difficulty = isDifficulty(body.difficulty) ? body.difficulty : "intermediate";
  const topic = typeof body.topic === "string" && body.topic.trim() ? body.topic.trim() : "daily conversation";
  const assistantText = createSessionStarter(difficulty);
  let audioBase64: string | undefined;

  if (hasOpenAIKey()) {
    audioBase64 = await synthesizeJapanese(assistantText);
  }

  const payload: SessionStart = {
    sessionId: crypto.randomUUID(),
    topic,
    difficulty,
    assistantText,
    audioBase64,
    demoMode: !hasOpenAIKey()
  };

  return NextResponse.json(payload);
}
