"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";
import { mealShare, money, todayLocal } from "@/lib/format";
import { Button, Card, ErrorText, Field } from "@/components/ui";

export default function MealForm({ teamId, mealId }: { teamId: string; mealId?: string }) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [f, setF] = useState({ eaten_on: todayLocal(), title: "", total_amount: 0, note: "" });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase.from("players").select("*").eq("team_id", teamId).order("name");
      setPlayers((ps as Player[]) ?? []);
      if (mealId) {
        const { data: m } = await supabase.from("meals").select("*, meal_players(player_id)").eq("id", mealId).single();
        if (m) {
          setF({ eaten_on: m.eaten_on, title: m.title ?? "", total_amount: m.total_amount, note: m.note ?? "" });
          setSelected(new Set((m.meal_players as { player_id: string }[]).map((x) => x.player_id)));
        }
      }
      setReady(true);
    })();
  }, [teamId, mealId]);

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const payload = { ...f, title: f.title.trim() || null, note: f.note.trim() || null };
    let id = mealId;
    if (id) {
      const { error } = await supabase.from("meals").update(payload).eq("id", id);
      if (error) { setErr(error.message); setBusy(false); return; }
    } else {
      const { data, error } = await supabase.from("meals").insert({ ...payload, team_id: teamId }).select("id").single();
      if (error || !data) { setErr(error?.message ?? "Lỗi tạo buổi ăn"); setBusy(false); return; }
      id = data.id;
    }
    await supabase.from("meal_players").delete().eq("meal_id", id!);
    if (selected.size) {
      const { error } = await supabase.from("meal_players").insert([...selected].map((player_id) => ({ meal_id: id!, player_id })));
      if (error) { setErr(error.message); setBusy(false); return; }
    }
    router.push(`/teams/${teamId}/meals`);
  };

  const remove = async () => {
    if (!mealId || !confirm("Xóa buổi ăn này?")) return;
    const { error } = await supabase.from("meals").delete().eq("id", mealId);
    if (error) return setErr(error.message);
    router.push(`/teams/${teamId}/meals`);
  };

  if (!ready) return <p className="text-slate-500">Đang tải…</p>;

  return (
    <form onSubmit={save} className="space-y-4">
      <h2 className="text-xl font-bold">{mealId ? "Sửa buổi ăn" : "Tạo buổi ăn"}</h2>
      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ngày ăn" type="date" required value={f.eaten_on} onChange={(e) => setF({ ...f, eaten_on: e.target.value })} />
          <Field label="Quán / món" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="VD: Lẩu nướng Hàn Quốc" />
          <Field label="Tổng tiền bữa ăn (đ)" type="number" min={0} inputMode="numeric" value={f.total_amount}
            onChange={(e) => setF({ ...f, total_amount: Number(e.target.value) })} hint={f.total_amount > 0 ? money(f.total_amount) : undefined} />
          <Field label="Ghi chú" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Người ăn <span className="font-normal text-slate-400">({selected.size} đã chọn · không bắt buộc)</span></h3>
          {players.length > 0 && (
            <button type="button" className="text-sm text-emerald-600" onClick={() => setSelected(selected.size === players.length ? new Set() : new Set(players.map((p) => p.id)))}>
              {selected.size === players.length ? "Bỏ chọn hết" : "Chọn tất cả"}
            </button>
          )}
        </div>
        {players.length === 0 ? <p className="text-sm text-slate-500">Team chưa có lông thủ. Hãy thêm ở tab “Lông thủ”.</p> : (
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const on = selected.has(p.id);
              return (
                <button type="button" key={p.id} onClick={() => toggle(p.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  {on ? "✓ " : ""}{p.name}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="bg-emerald-50 text-sm">
        <div className="flex justify-between text-base"><span>Tổng tiền</span><b>{money(f.total_amount)}</b></div>
        {selected.size > 0 && <div className="mt-1 flex justify-between text-emerald-700"><span>Mỗi người ({selected.size})</span><b>{money(mealShare(f.total_amount, selected.size))}</b></div>}
      </Card>

      <ErrorText msg={err} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} className="flex-1 sm:flex-none">{busy ? "Đang lưu…" : "Lưu buổi ăn"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/teams/${teamId}/meals`)}>Hủy</Button>
        {mealId && <Button type="button" variant="danger" onClick={remove} className="ml-auto">Xóa</Button>}
      </div>
    </form>
  );
}
