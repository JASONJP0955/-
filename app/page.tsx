"use client";

import {
  Bot,
  CheckCircle2,
  Loader2,
  Mic,
  Play,
  RotateCcw,
  Send,
  Square,
  User,
  Volume2
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, CoachReply, Difficulty, SessionStart } from "@/types/coach";

type CoachResponse = CoachReply & {
  audioBase64?: string;
  demoMode: boolean;
};

const difficultyLabels: Record<Difficulty, string> = {
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级"
};

function nowId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function speakBrowserJa(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

function playBase64Audio(audioBase64?: string, fallbackText?: string) {
  if (audioBase64) {
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    void audio.play();
    return;
  }

  if (fallbackText) speakBrowserJa(fallbackText);
}

export default function Home() {
  const [difficulty, setDifficulty] = useState<Difficulty>("intermediate");
  const [topic, setTopic] = useState("daily conversation");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [feedback, setFeedback] = useState<CoachReply | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages]
  );

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function startSession() {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, difficulty })
      });

      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as SessionStart;
      const message: ChatMessage = {
        id: nowId(),
        role: "assistant",
        text: data.assistantText,
        createdAt: new Date().toISOString()
      };

      setSessionId(data.sessionId);
      setMessages([message]);
      setFeedback(null);
      setRecordedBlob(null);
      setDemoMode(data.demoMode);
      playBase64Audio(data.audioBase64, data.assistantText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "会话启动失败");
    } finally {
      setIsBusy(false);
    }
  }

  async function startRecording() {
    setError(null);
    setRecordedBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setError("无法访问麦克风。请允许浏览器使用麦克风后再试。");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }

  async function submitRecording() {
    if (!recordedBlob) return;
    setIsBusy(true);
    setError(null);

    try {
      const form = new FormData();
      form.set("audio", new File([recordedBlob], "answer.webm", { type: recordedBlob.type || "audio/webm" }));
      form.set("topic", topic);
      form.set("difficulty", difficulty);
      form.set(
        "history",
        JSON.stringify(messages.map((message) => ({ role: message.role, text: message.text })))
      );

      const response = await fetch("/api/respond", {
        method: "POST",
        body: form
      });

      if (!response.ok) throw new Error(await response.text());
      const data = (await response.json()) as CoachResponse;
      const userMessage: ChatMessage = {
        id: nowId(),
        role: "user",
        text: data.transcriptJa,
        createdAt: new Date().toISOString()
      };
      const assistantMessage: ChatMessage = {
        id: nowId(),
        role: "assistant",
        text: data.nextReplyJa,
        createdAt: new Date().toISOString()
      };

      setMessages((current) => [...current, userMessage, assistantMessage]);
      setFeedback(data);
      setDemoMode(data.demoMode);
      setRecordedBlob(null);
      playBase64Audio(data.audioBase64, data.nextReplyJa);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
    } finally {
      setIsBusy(false);
    }
  }

  function replayLatest() {
    if (latestAssistant) speakBrowserJa(latestAssistant.text);
  }

  return (
    <main className="shell">
      <section className="workspace" aria-label="Japanese voice coach workspace">
        <aside className="side-panel">
          <div className="brand-lockup">
            <Image src="/coach-avatar.svg" width={72} height={72} alt="Nihongo coach" priority />
            <div>
              <p className="eyebrow">Nihongo Voice Coach</p>
              <h1>日语语音陪练</h1>
            </div>
          </div>

          <div className="control-block">
            <label htmlFor="topic">话题</label>
            <input
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="daily conversation"
            />
          </div>

          <div className="control-block">
            <span>难度</span>
            <div className="segments">
              {(Object.keys(difficultyLabels) as Difficulty[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={difficulty === value ? "active" : ""}
                  onClick={() => setDifficulty(value)}
                >
                  {difficultyLabels[value]}
                </button>
              ))}
            </div>
          </div>

          <button className="primary-action" type="button" onClick={startSession} disabled={isBusy}>
            {isBusy ? <Loader2 className="spin" size={18} /> : <Bot size={18} />}
            开始会话
          </button>

          <button className="ghost-action" type="button" onClick={replayLatest} disabled={!latestAssistant}>
            <Volume2 size={18} />
            重播机器人
          </button>

          <div className="status-strip">
            <CheckCircle2 size={17} />
            <span>{demoMode ? "Demo 模式" : "API 模式"}</span>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="chat-header">
            <div>
              <p className="eyebrow">当前会话</p>
              <h2>{sessionId ? "正在练习" : "准备开始"}</h2>
            </div>
            <button type="button" className="icon-button" onClick={() => setMessages([])} title="清空">
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty-state">
                <Bot size={32} />
                <p>点击开始会话后，机器人会先用日语开口。</p>
              </div>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={`message ${message.role}`}>
                  <div className="message-icon">{message.role === "assistant" ? <Bot size={18} /> : <User size={18} />}</div>
                  <p>{message.text}</p>
                </article>
              ))
            )}
          </div>

          <div className="recorder">
            <div className={`wave ${isRecording ? "live" : ""}`} aria-hidden="true">
              {Array.from({ length: 18 }).map((_, index) => (
                <span key={index} style={{ animationDelay: `${index * 65}ms` }} />
              ))}
            </div>

            <div className="recorder-actions">
              {!isRecording ? (
                <button type="button" className="record-button" onClick={startRecording} disabled={!sessionId || isBusy}>
                  <Mic size={20} />
                  录音
                </button>
              ) : (
                <button type="button" className="stop-button" onClick={stopRecording}>
                  <Square size={18} />
                  停止
                </button>
              )}
              <button type="button" className="secondary-action" onClick={submitRecording} disabled={!recordedBlob || isBusy}>
                {isBusy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                提交
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => recordedBlob && new Audio(URL.createObjectURL(recordedBlob)).play()}
                disabled={!recordedBlob}
                title="试听录音"
              >
                <Play size={18} />
              </button>
            </div>

            {error ? <p className="error">{error}</p> : null}
          </div>
        </section>

        <aside className="feedback-panel">
          <div className="feedback-header">
            <p className="eyebrow">文字建议</p>
            <h2>反馈</h2>
          </div>

          {feedback ? (
            <div className="feedback-stack">
              <section>
                <h3>你的回答</h3>
                <p className="quote-ja">{feedback.transcriptJa}</p>
              </section>

              <section>
                <h3>更自然的说法</h3>
                <p className="quote-ja">{feedback.naturalExpressionJa}</p>
              </section>

              <section>
                <h3>语法</h3>
                {feedback.grammarFeedback.length ? (
                  feedback.grammarFeedback.map((item) => (
                    <div className="feedback-item" key={`${item.title}-${item.correctionJa}`}>
                      <strong>{item.title}</strong>
                      <p>{item.explanationZh}</p>
                      <code>{item.correctionJa}</code>
                    </div>
                  ))
                ) : (
                  <p className="muted">没有明显语法问题。</p>
                )}
              </section>

              <section>
                <h3>发音</h3>
                {feedback.pronunciationFeedback.length ? (
                  feedback.pronunciationFeedback.map((item) => (
                    <div className="feedback-item" key={`${item.target}-${item.practiceJa}`}>
                      <strong>{item.target}</strong>
                      <p>{item.issueZh}</p>
                      <code>{item.practiceJa}</code>
                    </div>
                  ))
                ) : (
                  <p className="muted">本轮没有明显发音提示。</p>
                )}
              </section>

              <section>
                <h3>分数</h3>
                <div className="score-grid">
                  <span>语法 {feedback.scores.grammar}</span>
                  <span>发音 {feedback.scores.pronunciation}</span>
                  <span>流畅 {feedback.scores.fluency}</span>
                </div>
              </section>
            </div>
          ) : (
            <div className="empty-state compact">
              <Volume2 size={28} />
              <p>提交一次录音后，这里会显示中文文字反馈。</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
