"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";
import { money, perPlayer, sessionTotal, todayLocal } from "@/lib/format";
import { Button, Card, ErrorText, Field } from "@/components/ui";

const HL = "!border-emerald-300 !bg-emerald-50"; // tô màu ô đang dùng giá mặc định

export default function SessionForm({ teamId, sessionId }: { teamId: string; sessionId?: string }) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [defaults, setDefaults] = useState({ court: 0, shuttle: 0 });
  const [f, setF] = useState({ played_on: todayLocal(), location: "", court_price: 0, shuttle_price: 0, shuttle_count: 0, note: "" });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase.from("players").select("*").eq("team_id", teamId).order("name");
      setPlayers((ps as Player[]) ?? []);
      const { data: t } = await supabase.from("teams").select("default_court_price, default_shuttle_price").eq("id", teamId).single();
      const d = { court: t?.default_court_price ?? 0, shuttle: t?.default_shuttle_price ?? 0 };
      setDefaults(d);
      if (sessionId) {
        const { data: s } = await supabase.from("sessions").select("*, session_players(player_id)").eq("id", sessionId).single();
        if (s) {
          setF({ played_on: s.played_on, location: s.location ?? "", court_price: s.court_price, shuttle_price: s.shuttle_price, shuttle_count: s.shuttle_count, note: s.note ?? "" });
          setSelected(new Set((s.session_players as { player_id: string }[]).map((x) => x.player_id)));
        }
      } else {
        setF((p) => ({ ...p, court_price: d.court, shuttle_price: d.shuttle }));
      }
      setReady(true);
    })();
  }, [teamId, sessionId]);

  const toggle = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const payload = { ...f, location: f.location.trim() || null, note: f.note.trim() || null };
    let id = sessionId;
    if (id) {
      const { error } = await supabase.from("sessions").update(payload).eq("id", id);
      if (error) { setErr(error.message); setBusy(false); return; }
    } else {
      const { data, error } = await supabase.from("sessions").insert({ ...payload, team_id: teamId }).select("id").single();
      if (error || !data) { setErr(error?.message ?? "Lỗi tạo buổi chơi"); setBusy(false); return; }
      id = data.id;
    }
    await supabase.from("session_players").delete().eq("session_id", id!);
    if (selected.size) {
      const { error } = await supabase.from("session_players").insert([...selected].map((player_id) => ({ session_id: id!, player_id })));
      if (error) { setErr(error.message); setBusy(false); return; }
    }
    router.push(`/teams/${teamId}/sessions`);
  };

  const remove = async () => {
    if (!sessionId || !confirm("Xóa buổi chơi này?")) return;
    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    if (error) return setErr(error.message);
    router.push(`/teams/${teamId}/sessions`);
  };

  if (!ready) return <p className="text-slate-500">Đang tải…</p>;
  const total = sessionTotal(f);
  const num = (k: "court_price" | "shuttle_price" | "shuttle_count") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) });
  const noDefaults = defaults.court === 0 && defaults.shuttle === 0;

  const priceHint = (key: "court_price" | "shuttle_price", def: number) =>
    f[key] === def ? (
      <span className="text-emerald-600">✔ Đang dùng giá mặc định ({money(def)})</span>
    ) : (
      <>
        Mặc định: {money(def)}{" "}
        <button type="button" className="font-medium text-emerald-600 underline" onClick={() => setF({ ...f, [key]: def })}>↺ Dùng lại</button>
      </>
    );

  return (
    <form onSubmit={save} className="space-y-4">
      <h2 className="text-xl font-bold">{sessionId ? "Sửa buổi chơi" : "Tạo buổi chơi"}</h2>

      {!sessionId && (
        noDefaults ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Team chưa cài giá mặc định. <Link href={`/teams/${teamId}/settings`} className="font-medium underline">Vào Cài đặt</Link> để giá sân và giá cầu tự điền mỗi lần tạo buổi.
          </div>
        ) : (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            ✨ Đã tự điền giá mặc định từ Cài đặt: sân <b>{money(defaults.court)}</b>, cầu <b>{money(defaults.shuttle)}</b>/quả. Bạn vẫn có thể sửa cho buổi này.
          </div>
        )
      )}

      <Card className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ngày chơi" type="date" required value={f.played_on} onChange={(e) => setF({ ...f, played_on: e.target.value })} />
          <Field label="Địa điểm / sân" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="VD: Sân Phú Lộc" />
          <Field label="Giá sân (đ)" type="number" min={0} inputMode="numeric" value={f.court_price} onChange={num("court_price")}
            className={f.court_price === defaults.court && defaults.court > 0 ? HL : ""} hint={defaults.court > 0 ? priceHint("court_price", defaults.court) : undefined} />
          <Field label="Giá cầu (đ / quả)" type="number" min={0} inputMode="numeric" value={f.shuttle_price} onChange={num("shuttle_price")}
            className={f.shuttle_price === defaults.shuttle && defaults.shuttle > 0 ? HL : ""} hint={defaults.shuttle > 0 ? priceHint("shuttle_price", defaults.shuttle) : undefined} />
          <Field label="Số quả cầu đã dùng" type="number" min={0} inputMode="numeric" value={f.shuttle_count} onChange={num("shuttle_count")} />
          <Field label="Ghi chú" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Người chơi <span className="font-normal text-slate-400">({selected.size} đã chọn · không bắt buộc)</span></h3>
          {players.length > 0 && (
            <button type="button" className="text-sm text-emerald-600" onClick={() => setSelected(selected.size === players.length ? new Set() : new Set(players.map((p) => p.id)))}>
              {selected.size === players.length ? "Bỏ chọn hết" : "Chọn tất cả"}
            </button>
          )}
        </div>
        {players.length === 0 ? <p className="text-sm text-slate-500">Team chưa có lông thủ. Bạn có thể thêm sau ở tab “Lông thủ”.</p> : (
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
        <div className="flex justify-between"><span>Tiền cầu ({f.shuttle_count} × {money(f.shuttle_price)})</span><b>{money(f.shuttle_price * f.shuttle_count)}</b></div>
        <div className="flex justify-between"><span>Tiền sân</span><b>{money(f.court_price)}</b></div>
        <div className="mt-1 flex justify-between border-t border-emerald-200 pt-1 text-base"><span>Tổng buổi</span><b>{money(total)}</b></div>
        {selected.size > 0 && <div className="mt-1 flex justify-between text-emerald-700"><span>Mỗi người ({selected.size})</span><b>{money(perPlayer(f, selected.size))}</b></div>}
      </Card>

      <ErrorText msg={err} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} className="flex-1 sm:flex-none">{busy ? "Đang lưu…" : "Lưu buổi chơi"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push(`/teams/${teamId}/sessions`)}>Hủy</Button>
        {sessionId && <Button type="button" variant="danger" onClick={remove} className="ml-auto">Xóa</Button>}
      </div>
    </form>
  );
}
