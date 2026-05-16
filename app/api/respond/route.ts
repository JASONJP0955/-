import { NextResponse } from "next/server";
import { continueConversation, demoReply } from "@/lib/coach";
import { hasOpenAIKey, synthesizeJapanese } from "@/lib/openai";
import { transcribeJapanese } from "@/lib/speech";
import type { Difficulty } from "@/types/coach";

export const runtime = "nodejs";

function isDifficulty(value: unknown): value is Difficulty {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const topic = String(form.get("topic") ?? "daily conversation");
    const sessionId = String(form.get("sessionId") || crypto.randomUUID());
    const difficultyValue = form.get("difficulty");
    const difficulty = isDifficulty(difficultyValue) ? difficultyValue : "intermediate";
    const rawHistory = String(form.get("history") ?? "[]");
    const history = JSON.parse(rawHistory) as { role: "assistant" | "user"; text: string }[];

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "没有收到录音文件。" }, { status: 400 });
    }

    if (!hasOpenAIKey()) {
      const demo = demoReply();
      return NextResponse.json({
        transcriptJa: demo.transcriptJa,
        nextReplyJa: demo.nextReplyJa,
        topicState: demo.topicState,
        nextTopicSuggestionZh: demo.nextTopicSuggestionZh,
        audioBase64: undefined,
        demoMode: true
      });
    }

    const transcriptJa = await transcribeJapanese(audio);
    const reply = await continueConversation({
      transcriptJa,
      topic,
      difficulty,
      history: [...history, { role: "user", text: transcriptJa }]
    });
    const audioBase64 = await synthesizeJapanese(reply.nextReplyJa);

    return NextResponse.json({
      ...reply,
      audioBase64,
      demoMode: false
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "分析失败，请稍后再试。"
      },
      { status: 500 }
    );
  }
}
