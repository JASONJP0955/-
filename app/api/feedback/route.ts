import { NextResponse } from "next/server";
import { javaPostForm } from "@/lib/java-backend";
import { saveConversationTurn } from "@/lib/persistence";
import type { CoachReply, Difficulty } from "@/types/coach";

export const runtime = "nodejs";

function isDifficulty(value: unknown): value is Difficulty {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const topic = String(form.get("topic") ?? "日本就職面接");
    const sessionId = String(form.get("sessionId") || crypto.randomUUID());
    const difficultyValue = form.get("difficulty");
    const difficulty = isDifficulty(difficultyValue) ? difficultyValue : "intermediate";

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "没有收到录音文件。" }, { status: 400 });
    }

    const coach = await javaPostForm<CoachReply & { demoMode?: boolean }>("/api/feedback", form);
    const persistence = coach.demoMode
      ? { persisted: false }
      : await saveConversationTurn({
          sessionId,
          topic,
          difficulty,
          audio,
          coach
        });

    return NextResponse.json({
      ...coach,
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
