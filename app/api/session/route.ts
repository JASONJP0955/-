import { NextResponse } from "next/server";
import { javaPostJson } from "@/lib/java-backend";
import { createConversationSession } from "@/lib/persistence";
import type { SessionStart } from "@/types/coach";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const payload = await javaPostJson<SessionStart>("/api/session", body);

  await createConversationSession({
    sessionId: payload.sessionId,
    topic: payload.topic,
    difficulty: payload.difficulty,
    assistantText: payload.assistantText
  });

  return NextResponse.json(payload);
}
