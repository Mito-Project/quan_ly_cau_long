"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/types";
import { Button, Card, ErrorText, Field, Modal } from "@/components/ui";

const empty = { name: "", phone: "", note: "" };

export default function PlayersPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Player | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [err, setErr] = useState("");

  const load = async () => {
    const { data, error } = await supabase.from("players").select("*").eq("team_id", teamId).order("name");
    if (error) setErr(error.message);
    setPlayers((data as Player[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [teamId]);

  const openNew = () => { setEditing(null); setForm(empty); setErr(""); setOpen(true); };
  const openEdit = (p: Player) => { setEditing(p); setForm({ name: p.name, phone: p.phone ?? "", note: p.note ?? "" }); setErr(""); setOpen(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name.trim(), phone: form.phone.trim() || null, note: form.note.trim() || null };
    const { error } = editing
      ? await supabase.from("players").update(payload).eq("id", editing.id)
      : await supabase.from("players").insert({ ...payload, team_id: teamId });
    if (error) return setErr(error.message);
    setOpen(false); load();
  };

  const remove = async (p: Player) => {
    if (!confirm(`Xóa lông thủ "${p.name}"? Người này cũng bị gỡ khỏi các buổi chơi.`)) return;
    const { error } = await supabase.from("players").delete().eq("id", p.id);
    if (error) setErr(error.message);
    load();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Lông thủ <span className="text-base font-normal text-slate-400">({players.length})</span></h2>
        <Button onClick={openNew}>+ Thêm</Button>
      </div>
      {!open && <ErrorText msg={err} />}
      {loading ? <p className="text-slate-500">Đang tải…</p> : players.length === 0 ? (
        <Card className="text-center text-slate-500">Chưa có lông thủ nào.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {players.map((p) => (
            <Card key={p.id} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="truncate text-sm text-slate-500">{p.phone || "—"}{p.note ? ` · ${p.note}` : ""}</div>
              </div>
              <button onClick={() => openEdit(p)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Sửa">✏️</button>
              <button onClick={() => remove(p)} className="rounded-lg p-2 hover:bg-red-50" aria-label="Xóa">🗑️</button>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} title={editing ? "Sửa lông thủ" : "Thêm lông thủ"} onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Tên" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Số điện thoại" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Field label="Ghi chú" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <ErrorText msg={err} />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>Hủy</Button>
            <Button type="submit" className="flex-1">Lưu</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
