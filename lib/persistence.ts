import type { CoachReply, Difficulty } from "@/types/coach";
import { createClient } from "@/lib/supabase/server";

const RECORDINGS_BUCKET = "user-recordings";
type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

function normalizeAudioContentType(type: string) {
  if (type.includes("webm")) return "audio/webm";
  if (type.includes("ogg")) return "audio/ogg";
  if (type.includes("mpeg")) return "audio/mpeg";
  if (type.includes("wav")) return "audio/wav";
  return "audio/webm";
}

function cleanBase64Audio(audioBase64?: string) {
  if (!audioBase64) return "";
  const value = audioBase64.includes(",") ? audioBase64.split(",").pop() : audioBase64;
  return value?.trim() ?? "";
}

async function uploadAssistantAudio(params: {
  supabase: SupabaseClient;
  userId: string;
  sessionId: string;
  utteranceId: string;
  audioBase64?: string;
}) {
  const cleaned = cleanBase64Audio(params.audioBase64);
  if (!cleaned) return undefined;

  const audioPath = `${params.userId}/${params.sessionId}/${params.utteranceId}.mp3`;
  const { error } = await params.supabase.storage.from(RECORDINGS_BUCKET).upload(audioPath, Buffer.from(cleaned, "base64"), {
    cacheControl: "3600",
    contentType: "audio/mpeg",
    upsert: false
  });

  if (error) throw error;
  return audioPath;
}

export async function createConversationSession(params: {
  sessionId: string;
  topic: string;
  difficulty: Difficulty;
  assistantText: string;
  assistantAudioBase64?: string;
}) {
  try {
    const supabase = await createClient();
    if (!supabase) return { persisted: false };

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return { persisted: false };

    const { error: sessionError } = await supabase.from("conversation_sessions").insert({
      id: params.sessionId,
      user_id: user.id,
      topic: params.topic,
      difficulty: params.difficulty,
      assistant_starter: params.assistantText
    });

    if (sessionError) throw sessionError;

    const assistantUtteranceId = crypto.randomUUID();
    const assistantAudioPath = await uploadAssistantAudio({
      supabase,
      userId: user.id,
      sessionId: params.sessionId,
      utteranceId: assistantUtteranceId,
      audioBase64: params.assistantAudioBase64
    });

    await supabase.from("utterances").insert({
      id: assistantUtteranceId,
      session_id: params.sessionId,
      user_id: user.id,
      speaker: "assistant",
      text: params.assistantText,
      audio_path: assistantAudioPath
    });

    return { persisted: true };
  } catch (error) {
    console.error("Failed to persist conversation session:", error);
    return { persisted: false };
  }
}

export async function saveConversationTurn(params: {
  sessionId: string;
  topic: string;
  difficulty: Difficulty;
  audio: File;
  coach: CoachReply;
  assistantAudioBase64?: string;
}) {
  try {
    const supabase = await createClient();
    if (!supabase) return { persisted: false };

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return { persisted: false };

    await supabase.from("conversation_sessions").upsert(
      {
        id: params.sessionId,
        user_id: user.id,
        topic: params.topic,
        difficulty: params.difficulty
      },
      { onConflict: "id" }
    );

    const utteranceId = crypto.randomUUID();
    const assistantUtteranceId = crypto.randomUUID();
    const contentType = normalizeAudioContentType(params.audio.type);
    const extension = contentType.split("/")[1] ?? "webm";
    const audioPath = `${user.id}/${params.sessionId}/${utteranceId}.${extension}`;

    const { error: uploadError } = await supabase.storage.from(RECORDINGS_BUCKET).upload(audioPath, params.audio, {
      cacheControl: "3600",
      contentType,
      upsert: false
    });

    if (uploadError) throw uploadError;

    const { error: utteranceError } = await supabase.from("utterances").insert({
      id: utteranceId,
      session_id: params.sessionId,
      user_id: user.id,
      speaker: "user",
      text: params.coach.transcriptJa,
      audio_path: audioPath
    });

    if (utteranceError) throw utteranceError;

    const { error: feedbackError } = await supabase.from("feedback").insert({
      utterance_id: utteranceId,
      user_id: user.id,
      transcript_ja: params.coach.transcriptJa,
      natural_expression_ja: params.coach.naturalExpressionJa,
      error_feedback: params.coach.errorFeedback,
      grammar_feedback: params.coach.grammarFeedback,
      pronunciation_feedback: params.coach.pronunciationFeedback,
      grammar_score: params.coach.scores.grammar,
      pronunciation_score: params.coach.scores.pronunciation,
      fluency_score: params.coach.scores.fluency,
      topic_state: params.coach.topicState,
      next_topic_suggestion_zh: params.coach.nextTopicSuggestionZh
    });

    if (feedbackError) throw feedbackError;

    const assistantAudioPath = await uploadAssistantAudio({
      supabase,
      userId: user.id,
      sessionId: params.sessionId,
      utteranceId: assistantUtteranceId,
      audioBase64: params.assistantAudioBase64
    });

    await supabase.from("utterances").insert({
      id: assistantUtteranceId,
      session_id: params.sessionId,
      user_id: user.id,
      speaker: "assistant",
      text: params.coach.nextReplyJa,
      audio_path: assistantAudioPath
    });

    return { persisted: true, audioPath };
  } catch (error) {
    console.error("Failed to persist conversation turn:", error);
    return { persisted: false };
  }
}
