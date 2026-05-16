import { NextResponse } from "next/server";
import { createSessionStarter } from "@/lib/coach";
import { hasOpenAIKey, synthesizeJapanese } from "@/lib/openai";
import { createConversationSession } from "@/lib/persistence";
import type { Difficulty, SessionStart } from "@/types/coach";

export const runtime = "nodejs";

function isDifficulty(value: unknown): value is Difficulty {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const difficulty = isDifficulty(body.difficulty) ? body.difficulty : "intermediate";
  const selectedTopic = createSessionStarter(difficulty);
  const topic = selectedTopic.topic;
  const assistantText = selectedTopic.starter;
  const sessionId = crypto.randomUUID();
  let audioBase64: string | undefined;

  if (hasOpenAIKey()) {
    audioBase64 = await synthesizeJapanese(assistantText);
  }

  const payload: SessionStart = {
    sessionId,
    topic,
    difficulty,
    assistantText,
    audioBase64,
    demoMode: !hasOpenAIKey()
  };

  await createConversationSession({
    sessionId,
    topic,
    difficulty,
    assistantText
  });

  return NextResponse.json(payload);
}
