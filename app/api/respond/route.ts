import { NextResponse } from "next/server";
import { demoReply, evaluateAndContinue } from "@/lib/coach";
import { hasOpenAIKey, synthesizeJapanese, transcribeJapanese } from "@/lib/openai";
import type { Difficulty } from "@/types/coach";

export const runtime = "nodejs";

function isDifficulty(value: unknown): value is Difficulty {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const audio = form.get("audio");
  const topic = String(form.get("topic") ?? "daily conversation");
  const difficultyValue = form.get("difficulty");
  const difficulty = isDifficulty(difficultyValue) ? difficultyValue : "intermediate";
  const rawHistory = String(form.get("history") ?? "[]");
  const history = JSON.parse(rawHistory) as { role: "assistant" | "user"; text: string }[];

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Missing audio file." }, { status: 400 });
  }

  if (!hasOpenAIKey()) {
    return NextResponse.json({
      ...demoReply(),
      audioBase64: undefined,
      demoMode: true
    });
  }

  const transcriptJa = await transcribeJapanese(audio);
  const coach = await evaluateAndContinue({
    transcriptJa,
    topic,
    difficulty,
    history: [...history, { role: "user", text: transcriptJa }]
  });
  const audioBase64 = await synthesizeJapanese(coach.nextReplyJa);

  return NextResponse.json({
    ...coach,
    audioBase64,
    demoMode: false
  });
}
