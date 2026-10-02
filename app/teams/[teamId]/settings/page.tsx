"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase, qrUrl } from "@/lib/supabase";
import type { Team } from "@/lib/types";
import { Button, Card, ErrorText, Field } from "@/components/ui";

export default function SettingsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [court, setCourt] = useState(0);
  const [shuttle, setShuttle] = useState(0);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("teams").select("*").eq("id", teamId).single();
    if (data) {
      const t = data as Team;
      setTeam(t); setName(t.name); setCourt(t.default_court_price); setShuttle(t.default_shuttle_price);
    }
  };
  useEffect(() => { load(); }, [teamId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    const { error } = await supabase.from("teams")
      .update({ name: name.trim(), default_court_price: court, default_shuttle_price: shuttle })
      .eq("id", teamId);
    if (error) setErr(error.message); else setMsg("Đã lưu cài đặt ✔");
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !team) return;
    setErr(""); setMsg(""); setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${teamId}/qr-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("qr").upload(path, file, { upsert: false });
    if (error) { setErr(error.message); setUploading(false); return; }
    if (team.qr_path) await supabase.storage.from("qr").remove([team.qr_path]);
    const { error: e2 } = await supabase.from("teams").update({ qr_path: path }).eq("id", teamId);
    if (e2) setErr(e2.message); else setMsg("Đã cập nhật ảnh QR ✔");
    setUploading(false); load();
  };

  const removeQr = async () => {
    if (!team?.qr_path || !confirm("Xóa ảnh QR?")) return;
    await supabase.storage.from("qr").remove([team.qr_path]);
    await supabase.from("teams").update({ qr_path: null }).eq("id", teamId);
    load();
  };

  const img = qrUrl(team?.qr_path ?? null);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Cài đặt team</h2>
      <Card>
        <form onSubmit={save} className="space-y-4">
          <Field label="Tên team" value={name} onChange={(e) => setName(e.target.value)} required />
          <Field label="Giá sân mặc định (đ / buổi)" type="number" min={0} inputMode="numeric" value={court} onChange={(e) => setCourt(Number(e.target.value))} />
          <Field label="Giá cầu mặc định (đ / quả)" type="number" min={0} inputMode="numeric" value={shuttle} onChange={(e) => setShuttle(Number(e.target.value))} />
          <ErrorText msg={err} />
          {msg && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{msg}</p>}
          <Button type="submit">Lưu cài đặt</Button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold">QR tài khoản ngân hàng</h3>
        <p className="mb-3 text-sm text-slate-500">Ảnh này sẽ hiện ở cuối file PDF thanh toán.</p>
        {img && (
          <div className="mb-3 flex flex-col items-center gap-3 rounded-2xl bg-slate-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="QR ngân hàng" className="max-h-72 rounded-xl border bg-white object-contain" />
            <Button variant="danger" onClick={removeQr}>Xóa ảnh</Button>
          </div>
        )}
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-6 text-center hover:bg-emerald-50">
          <span className="font-medium text-emerald-700">{uploading ? "Đang tải lên…" : img ? "Chọn ảnh khác" : "Chọn ảnh QR để tải lên"}</span>
          <span className="text-xs text-slate-400">PNG / JPG</span>
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={uploading} />
        </label>
      </Card>
    </div>
  );
}
