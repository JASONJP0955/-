const OPENAI_BASE_URL = "https://api.openai.com/v1";

type JsonObject = Record<string, unknown>;

export function hasOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && key.startsWith("sk-") && key !== "sk-your-key-here");
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    ...extra
  };
}

export async function createResponseJson<T>(payload: JsonObject): Promise<T> {
  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI Responses API failed: ${response.status} ${detail}`);
  }

  const data = await response.json();
  const text = data.output_text;

  if (typeof text !== "string") {
    throw new Error("OpenAI response did not include output_text.");
  }

  return JSON.parse(text) as T;
}

export async function transcribeJapanese(audio: File): Promise<string> {
  const form = new FormData();
  form.set("file", audio);
  form.set("model", process.env.OPENAI_STT_MODEL ?? "gpt-4o-transcribe");
  form.set("language", "ja");
  form.set("response_format", "json");
  form.set(
    "prompt",
    "Japanese learner speech. Transcribe only what the speaker says in Japanese. Preserve particles, verb endings, long vowels, and short pauses as accurately as possible."
  );

  const response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: authHeaders(),
    body: form
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI transcription failed: ${response.status} ${detail}`);
  }

  const data = await response.json();
  return typeof data.text === "string" ? data.text : "";
}

export async function synthesizeJapanese(text: string): Promise<string> {
  const response = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE ?? "coral",
      input: text,
      instructions:
        "Speak natural, friendly Japanese for a language learner. Keep the pace clear but not robotic.",
      response_format: "mp3"
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI speech failed: ${response.status} ${detail}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.toString("base64");
}
