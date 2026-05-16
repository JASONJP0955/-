import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HistoryFloatingLink } from "@/components/history-floating-link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type FeedbackRow = {
  utterance_id: string;
  transcript_ja: string;
  natural_expression_ja: string;
  error_feedback: { categoryZh: string; originalJa: string; issueZh: string; suggestionZh: string; correctionJa: string }[];
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

  const [{ data: session }, { data: utterances }] = await Promise.all([
    supabase!
      .from("conversation_sessions")
      .select("id, topic, difficulty, started_at, assistant_starter")
      .eq("id", sessionId)
      .single(),
    supabase!
      .from("utterances")
      .select("id, speaker, text, audio_path, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
  ]);

  if (!session) notFound();

  const userUtteranceIds = (utterances ?? []).filter((item) => item.speaker === "user").map((item) => item.id);
  const { data: feedbackRows } = userUtteranceIds.length
    ? await supabase!
        .from("feedback")
        .select(
          "utterance_id, transcript_ja, natural_expression_ja, error_feedback, grammar_feedback, pronunciation_feedback, grammar_score, pronunciation_score, fluency_score"
        )
        .in("utterance_id", userUtteranceIds)
    : { data: [] };

  const feedbackByUtterance = new Map((feedbackRows as FeedbackRow[] | null)?.map((item) => [item.utterance_id, item]));
  const audioUrls = new Map<string, string>();

  const audioUtterances = (utterances ?? []).filter((utterance) => utterance.audio_path);
  if (audioUtterances.length) {
    const paths = audioUtterances.map((utterance) => utterance.audio_path as string);
    const { data } = await supabase!.storage.from("user-recordings").createSignedUrls(paths, 60 * 60);
    const signedUrlByPath = new Map((data ?? []).map((item) => [item.path, item.signedUrl]));
    for (const utterance of audioUtterances) {
      const signedUrl = signedUrlByPath.get(utterance.audio_path as string);
      if (signedUrl) audioUrls.set(utterance.id, signedUrl);
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
        </div>

        <div className="history-session">
          {(utterances ?? []).map((utterance) => {
            const feedback = feedbackByUtterance.get(utterance.id);
            return (
              <article className={`history-turn ${utterance.speaker}`} key={utterance.id}>
                <div className="history-turn-header">
                  <strong className="history-role-badge">{utterance.speaker === "user" ? "你的回复" : "机器人回复"}</strong>
                  {audioUrls.get(utterance.id) ? (
                    <audio controls src={audioUrls.get(utterance.id)} preload="none">
                      <track kind="captions" />
                    </audio>
                  ) : null}
                </div>
                <p className="quote-ja history-quote">{utterance.text}</p>

                {feedback ? (
                  <div className="feedback-stack compact-stack history-feedback">
                    <section className="history-feedback-section score-section">
                      <h3>分数</h3>
                      <div className="score-grid history-score-grid">
                        <span>
                          <small>语法</small>
                          <strong>{feedback.grammar_score}</strong>
                        </span>
                        <span>
                          <small>发音</small>
                          <strong>{feedback.pronunciation_score}</strong>
                        </span>
                        <span>
                          <small>流畅</small>
                          <strong>{feedback.fluency_score}</strong>
                        </span>
                      </div>
                    </section>
                    <section className="history-feedback-section natural-section">
                      <h3>更自然的说法</h3>
                      <p className="quote-ja history-quote">{feedback.natural_expression_ja}</p>
                    </section>
                    <section className="history-feedback-section error-section">
                      <h3>错误与改进建议</h3>
                      {feedback.error_feedback?.length ? (
                        feedback.error_feedback.map((item) => (
                          <div className="feedback-item" key={`${item.categoryZh}-${item.originalJa}-${item.correctionJa}`}>
                            <strong>{item.categoryZh}</strong>
                            <code>{item.originalJa}</code>
                            <p>{item.issueZh}</p>
                            <p>{item.suggestionZh}</p>
                            <code>{item.correctionJa}</code>
                          </div>
                        ))
                      ) : (
                        <p className="muted">没有明显词汇或语法错误。</p>
                      )}
                    </section>
                    <section className="history-feedback-section grammar-section">
                      <h3>语法</h3>
                      {feedback.grammar_feedback?.map((item) => (
                        <div className="feedback-item" key={`${item.title}-${item.correctionJa}`}>
                          <strong>{item.title}</strong>
                          <p>{item.explanationZh}</p>
                          <code>{item.correctionJa}</code>
                        </div>
                      ))}
                    </section>
                    <section className="history-feedback-section pronunciation-section">
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
      <HistoryFloatingLink href="/history">
        返回记录
      </HistoryFloatingLink>
    </main>
  );
}
