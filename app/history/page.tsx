import Link from "next/link";
import { redirect } from "next/navigation";
import { HistoryFloatingLink } from "@/components/history-floating-link";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";

export default async function HistoryPage() {
  if (!hasSupabaseConfig()) {
    return (
      <main className="history-shell">
        <section className="history-panel">
          <p className="eyebrow">History</p>
          <h1>还没有配置 Supabase</h1>
          <p className="muted">请先在 `.env.local` 里配置 Supabase URL 和 anon key，然后运行 `supabase/schema.sql`。</p>
        </section>
        <HistoryFloatingLink href="/">
          回到练习
        </HistoryFloatingLink>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) redirect("/login?next=/history");

  const { data: sessions } = await supabase!
    .from("conversation_sessions")
    .select("id, topic, started_at, assistant_starter")
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <main className="history-shell">
      <section className="history-panel">
        <div className="history-header">
          <div>
            <p className="eyebrow">History</p>
            <h1>练习记录</h1>
          </div>
        </div>

        {sessions?.length ? (
          <div className="history-list">
            {sessions.map((session) => (
              <Link className="history-item" href={`/history/${session.id}`} key={session.id} prefetch>
                <strong>{session.topic}</strong>
                <p>{session.assistant_starter}</p>
                <time>{new Date(session.started_at).toLocaleString("zh-CN")}</time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state compact">
            <p>还没有保存过练习。登录后完成一次录音分析，这里就会出现记录。</p>
          </div>
        )}
      </section>
      <HistoryFloatingLink href="/">
        回到练习
      </HistoryFloatingLink>
    </main>
  );
}
