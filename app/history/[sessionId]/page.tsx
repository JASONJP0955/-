import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type FeedbackRow = {
  utterance_id: string;
  transcript_ja: string;
  natural_expression_ja: string;
  grammar_feedback: { title: string; explanationZh: string; correctionJa: string }[];
  pronunciation_feedback: { target: string; issueZh: string; practiceJa: string }[];
  grammar_score: number;
  pronunciation_score: number;
  fluency_score: number;
};

export default async function SessionHistoryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;

  if (!hasSupabaseConfig()) redirect("/history");

  const supabase = await createClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) redirect(`/login?next=/history/${sessionId}`);

  const { data: session } = await supabase!
    .from("conversation_sessions")
    .select("id, topic, difficulty, started_at, assistant_starter")
    .eq("id", sessionId)
    .single();

  if (!session) notFound();

  const { data: utterances } = await supabase!
    .from("utterances")
    .select("id, speaker, text, audio_path, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const userUtteranceIds = (utterances ?? []).filter((item) => item.speaker === "user").map((item) => item.id);
  const { data: feedbackRows } = userUtteranceIds.length
    ? await supabase!
        .from("feedback")
        .select(
          "utterance_id, transcript_ja, natural_expression_ja, grammar_feedback, pronunciation_feedback, grammar_score, pronunciation_score, fluency_score"
        )
        .in("utterance_id", userUtteranceIds)
    : { data: [] };

  const feedbackByUtterance = new Map((feedbackRows as FeedbackRow[] | null)?.map((item) => [item.utterance_id, item]));
  const audioUrls = new Map<string, string>();

  for (const utterance of utterances ?? []) {
    if (utterance.audio_path) {
      const { data } = await supabase!.storage.from("user-recordings").createSignedUrl(utterance.audio_path, 60 * 60);
      if (data?.signedUrl) audioUrls.set(utterance.id, data.signedUrl);
    }
  }

  return (
    <main className="history-shell">
      <section className="history-panel">
        <div className="history-header">
          <div>
            <p className="eyebrow">Session</p>
            <h1>{session.topic}</h1>
            <p className="muted">
              {session.difficulty} · {new Date(session.started_at).toLocaleString("zh-CN")}
            </p>
          </div>
          <Link className="ghost-action" href="/history">
            返回记录
          </Link>
        </div>

        <div className="history-session">
          {(utterances ?? []).map((utterance) => {
            const feedback = feedbackByUtterance.get(utterance.id);
            return (
              <article className={`history-turn ${utterance.speaker}`} key={utterance.id}>
                <div className="history-turn-header">
                  <strong>{utterance.speaker === "user" ? "你" : "机器人"}</strong>
                  {audioUrls.get(utterance.id) ? (
                    <audio controls src={audioUrls.get(utterance.id)} preload="none">
                      <track kind="captions" />
                    </audio>
                  ) : null}
                </div>
                <p className="quote-ja">{utterance.text}</p>

                {feedback ? (
                  <div className="feedback-stack compact-stack">
                    <section>
                      <h3>分数</h3>
                      <div className="score-grid">
                        <span>语法 {feedback.grammar_score}</span>
                        <span>发音 {feedback.pronunciation_score}</span>
                        <span>流畅 {feedback.fluency_score}</span>
                      </div>
                    </section>
                    <section>
                      <h3>更自然的说法</h3>
                      <p className="quote-ja">{feedback.natural_expression_ja}</p>
                    </section>
                    <section>
                      <h3>语法</h3>
                      {feedback.grammar_feedback?.map((item) => (
                        <div className="feedback-item" key={`${item.title}-${item.correctionJa}`}>
                          <strong>{item.title}</strong>
                          <p>{item.explanationZh}</p>
                          <code>{item.correctionJa}</code>
                        </div>
                      ))}
                    </section>
                    <section>
                      <h3>发音</h3>
                      {feedback.pronunciation_feedback?.map((item) => (
                        <div className="feedback-item" key={`${item.target}-${item.practiceJa}`}>
                          <strong>{item.target}</strong>
                          <p>{item.issueZh}</p>
                          <code>{item.practiceJa}</code>
                        </div>
                      ))}
                    </section>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
