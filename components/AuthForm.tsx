"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button, Field, ErrorText } from "@/components/ui";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const isLogin = mode === "login";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
      else router.replace("/teams");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setErr(error.message);
      else if (data.session) router.replace("/teams");
      else setInfo("Đăng ký thành công! Hãy kiểm tra email để xác nhận tài khoản rồi đăng nhập.");
    }
    setBusy(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-5xl">🏸</div>
          <h1 className="mt-2 text-2xl font-bold">Badminton Manager</h1>
          <p className="text-sm text-slate-500">Quản lý nhóm cầu lông & chia tiền</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold">{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</h2>
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <Field label="Mật khẩu" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isLogin ? "current-password" : "new-password"} />
          <ErrorText msg={err} />
          {info && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Đang xử lý…" : isLogin ? "Đăng nhập" : "Đăng ký"}</Button>
          <p className="text-center text-sm text-slate-500">
            {isLogin ? "Chưa có tài khoản? " : "Đã có tài khoản? "}
            <Link href={isLogin ? "/register" : "/login"} className="font-medium text-emerald-600">
              {isLogin ? "Đăng ký" : "Đăng nhập"}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
