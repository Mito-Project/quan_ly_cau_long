"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Team } from "@/lib/types";
import AuthGuard from "@/components/AuthGuard";
import { Button, Card, ErrorText, Field } from "@/components/ui";

function Teams() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("teams").select("*").order("created_at");
    if (error) setErr(error.message);
    setTeams((data as Team[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const { error } = await supabase.from("teams").insert({ name: name.trim() });
    if (error) return setErr(error.message);
    setName(""); setErr(""); load();
  };

  const remove = async (t: Team) => {
    if (!confirm(`Xóa team "${t.name}"?\nToàn bộ lông thủ và buổi chơi của team sẽ bị xóa vĩnh viễn.`)) return;
    const { data: files } = await supabase.storage.from("qr").list(t.id);
    if (files?.length) await supabase.storage.from("qr").remove(files.map((f) => `${t.id}/${f.name}`));
    const { error } = await supabase.from("teams").delete().eq("id", t.id);
    if (error) setErr(error.message);
    load();
  };

  const logout = async () => { await supabase.auth.signOut(); router.replace("/login"); };

  return (
    <main className="mx-auto max-w-2xl p-4 pb-16">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏸 Chọn team</h1>
        <Button variant="ghost" onClick={logout}>Đăng xuất</Button>
      </header>

      <ErrorText msg={err} />

      {loading ? <p className="text-slate-500">Đang tải…</p> : (
        <div className="mt-2 space-y-3">
          {teams.length === 0 && <Card className="text-center text-slate-500">Bạn chưa có team nào. Hãy tạo team đầu tiên bên dưới 👇</Card>}
          {teams.map((t) => (
            <Card key={t.id} className="flex items-center justify-between gap-3">
              <Link href={`/teams/${t.id}/sessions`} className="flex-1">
                <div className="text-lg font-semibold">{t.name}</div>
                <div className="text-sm text-emerald-600">Vào quản lý →</div>
              </Link>
              <Button variant="danger" onClick={() => remove(t)}>Xóa</Button>
            </Card>
          ))}
        </div>
      )}

      <form onSubmit={create} className="mt-8 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4">
        <h2 className="mb-3 font-semibold">Tạo team mới</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1"><Field label="Tên team" value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Cầu lông tối thứ 3" required /></div>
          <Button type="submit">+ Tạo team</Button>
        </div>
      </form>
    </main>
  );
}

export default function Page() { return <AuthGuard><Teams /></AuthGuard>; }
