"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nextPath, setNextPath] = useState("/");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next") || "/");
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabaseConfigured) {
      setError("用户系统还没有连接。请在 Vercel 设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY 后重新部署。");
      return;
    }

    setIsBusy(true);

    try {
      const supabase = createClient();

      if (mode === "register") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
          }
        });

        if (signUpError) throw signUpError;
        setMessage("注册请求已提交。如果 Supabase 开启了邮箱确认，请先查看邮箱；否则可以直接登录。");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;
        window.location.href = nextPath;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请稍后再试。");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div>
          <p className="eyebrow">Nihongo Voice Coach</p>
          <h1>{mode === "login" ? "登录" : "注册"}</h1>
        </div>

        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            登录
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            注册
          </button>
        </div>

        {!supabaseConfigured ? (
          <p className="account-warning">当前部署没有读取到 Supabase 配置，所以暂时不能登录、注册或保存历史记录。</p>
        ) : null}

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" ? (
            <label>
              昵称
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Jason" />
            </label>
          ) : null}

          <label>
            邮箱
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          <button className="primary-action" type="submit" disabled={isBusy || !supabaseConfigured}>
            {isBusy ? <Loader2 className="spin" size={18} /> : null}
            {mode === "login" ? "登录" : "创建账号"}
          </button>
        </form>

        {message ? <p className="notice">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        <Link className="text-link" href="/">
          回到练习页
        </Link>
      </section>
    </main>
  );
}
