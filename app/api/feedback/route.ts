import { NextResponse } from "next/server";
import { demoReply, evaluateFeedback } from "@/lib/coach";
import { hasOpenAIKey } from "@/lib/openai";
import { saveConversationTurn } from "@/lib/persistence";
import type { CoachReply, Difficulty } from "@/types/coach";

export const runtime = "nodejs";

function isDifficulty(value: unknown): value is Difficulty {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

function isTopicState(value: unknown): CoachReply["topicState"] {
  return value === "shift" || value === "wrap_up" ? value : "continue";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const topic = String(form.get("topic") ?? "daily conversation");
    const sessionId = String(form.get("sessionId") || crypto.randomUUID());
    const difficultyValue = form.get("difficulty");
    const difficulty = isDifficulty(difficultyValue) ? difficultyValue : "intermediate";
    const transcriptJa = String(form.get("transcriptJa") ?? "");
    const nextReplyJa = String(form.get("nextReplyJa") ?? "");
    const topicState = isTopicState(form.get("topicState"));
    const nextTopicSuggestionZh = String(form.get("nextTopicSuggestionZh") ?? "");
    const rawHistory = String(form.get("history") ?? "[]");
    const history = JSON.parse(rawHistory) as { role: "assistant" | "user"; text: string }[];

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "没有收到录音文件。" }, { status: 400 });
    }

    if (!transcriptJa || !nextReplyJa) {
      return NextResponse.json({ error: "缺少转写文本或机器人回复。" }, { status: 400 });
    }

    if (!hasOpenAIKey()) {
      const demo = demoReply(transcriptJa);
      return NextResponse.json({
        ...demo,
        nextReplyJa,
        topicState,
        nextTopicSuggestionZh,
        demoMode: true,
        persisted: false
      });
    }

    const feedback = await evaluateFeedback({
      transcriptJa,
      topic,
      difficulty,
      history
    });
    const coach: CoachReply = {
      ...feedback,
      transcriptJa,
      nextReplyJa,
      topicState,
      nextTopicSuggestionZh
    };
    const persistence = await saveConversationTurn({
      sessionId,
      topic,
      difficulty,
      audio,
      coach
    });

    return NextResponse.json({
      ...coach,
      demoMode: false,
      persisted: persistence.persisted
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "反馈生成失败，请稍后再试。"
      },
      { status: 500 }
    );
  }
}
