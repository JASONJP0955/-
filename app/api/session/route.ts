import { NextResponse } from "next/server";
import { createSessionStarter } from "@/lib/coach";
import { hasOpenAIKey, synthesizeJapanese } from "@/lib/openai";
import { createConversationSession } from "@/lib/persistence";
import type { Difficulty, SessionStart } from "@/types/coach";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await request.json().catch(() => ({}));
  const difficulty: Difficulty = "intermediate";
  const selectedTopic = createSessionStarter();
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
