import { NextResponse } from "next/server";
import { javaPostForm } from "@/lib/java-backend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    return NextResponse.json(await javaPostForm("/api/respond", form));
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
