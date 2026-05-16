export default function SessionHistoryLoading() {
  return (
    <main className="history-shell">
      <section className="history-panel">
        <div>
          <p className="eyebrow">Session</p>
          <h1>正在加载记录</h1>
        </div>
        <div className="history-skeleton-list">
          <div className="history-skeleton-card tall" />
          <div className="history-skeleton-card tall" />
        </div>
      </section>
    </main>
  );
}
