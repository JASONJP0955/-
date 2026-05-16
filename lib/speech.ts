import { transcribeJapanese as transcribeWithOpenAI } from "@/lib/openai";

type SpeechProvider = "openai" | "google";

function speechProvider(): SpeechProvider {
  return process.env.STT_PROVIDER?.trim() === "google" ? "google" : "openai";
}

async function fileToBase64(file: File) {
  return Buffer.from(await file.arrayBuffer()).toString("base64");
}

async function transcribeWithGoogle(audio: File): Promise<string> {
  const accessToken = process.env.GOOGLE_SPEECH_ACCESS_TOKEN?.trim();
  const apiKey = process.env.GOOGLE_SPEECH_API_KEY?.trim();

  if (!accessToken && !apiKey) {
    throw new Error("Google Speech-to-Text is selected, but no Google credential is configured.");
  }

  const url = new URL("https://speech.googleapis.com/v1/speech:recognize");
  if (!accessToken && apiKey) {
    url.searchParams.set("key", apiKey);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify({
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: Number(process.env.GOOGLE_SPEECH_SAMPLE_RATE?.trim() ?? 48000),
        languageCode: "ja-JP",
        model: process.env.GOOGLE_SPEECH_MODEL?.trim() || "latest_short",
        enableAutomaticPunctuation: true,
        useEnhanced: true
      },
      audio: {
        content: await fileToBase64(audio)
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Speech-to-Text failed: ${response.status} ${detail}`);
  }

  const data = await response.json();
  const alternatives = data.results?.flatMap(
    (result: { alternatives?: { transcript?: string; confidence?: number }[] }) => result.alternatives ?? []
  );
  const best = alternatives?.sort(
    (a: { confidence?: number }, b: { confidence?: number }) => (b.confidence ?? 0) - (a.confidence ?? 0)
  )[0];

  return typeof best?.transcript === "string" ? best.transcript : "";
}

export async function transcribeJapanese(audio: File): Promise<string> {
  return speechProvider() === "google" ? transcribeWithGoogle(audio) : transcribeWithOpenAI(audio);
}
