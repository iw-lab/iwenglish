"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMsg("Supabase 키가 설정되지 않았어요 (.env.local 확인).");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("확인 메일을 보냈어요. 메일함을 확인해 주세요.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "오류가 발생했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <Link
        href="/more"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 돌아가기
      </Link>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold">
          <span className="text-primary">Echo</span>
          <span className="text-accent">Tale</span>
        </h1>
        <p className="font-ko text-sm text-muted-foreground">
          {mode === "signin" ? "다시 만나서 반가워요" : "함께 영어를 시작해요"}
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-chip border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-chip border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••"
            />
          </div>

          {msg && (
            <p className="font-ko text-sm text-accent" role="status">
              {msg}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "로그인" : "회원가입"}
          </Button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin"
            ? "계정이 없나요? 회원가입"
            : "이미 계정이 있나요? 로그인"}
        </button>
      </Card>
    </div>
  );
}
