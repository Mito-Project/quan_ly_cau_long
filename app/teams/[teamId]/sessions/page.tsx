"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/types";
import { dateVN, money, sessionTotal } from "@/lib/format";
import { Badge, Button, Card, ErrorText } from "@/components/ui";

type Row = Session & { session_players: { player_id: string }[] };

export default function SessionsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.from("sessions").select("*, session_players(player_id)").eq("team_id", teamId).order("played_on", { ascending: false })
      .then(({ data, error }) => { if (error) setErr(error.message); setRows((data as Row[]) ?? []); setLoading(false); });
  }, [teamId]);

  const shown = useMemo(() => rows.filter((r) => filter === "all" || (filter === "paid") === r.is_paid), [rows, filter]);
  const allOn = shown.length > 0 && shown.every((r) => sel.has(r.id));

  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSel(allOn ? new Set() : new Set(shown.map((r) => r.id)));
  const pay = () => router.push(`/teams/${teamId}/invoice?ids=${[...sel].join(",")}`);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Buổi chơi</h2>
        <Link href={`/teams/${teamId}/sessions/new`}><Button>+ Tạo buổi</Button></Link>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1 text-sm">
          {([["all", "Tất cả"], ["unpaid", "Chưa thanh toán"], ["paid", "Đã thanh toán"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-3 py-1.5 transition ${filter === k ? "bg-white font-medium shadow-sm" : "text-slate-500"}`}>{l}</button>
          ))}
        </div>
        {shown.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={allOn} onChange={toggleAll} /> Chọn hết
          </label>
        )}
      </div>

      <ErrorText msg={err} />
      {loading ? <p className="text-slate-500">Đang tải…</p> : shown.length === 0 ? (
        <Card className="text-center text-slate-500">Chưa có buổi chơi nào.</Card>
      ) : (
        <div className="space-y-2.5">
          {shown.map((r) => {
            const on = sel.has(r.id);
            return (
              <Card key={r.id} className={`flex items-center gap-3 transition ${on ? "!border-emerald-400 bg-emerald-50/50" : ""}`}>
                <input type="checkbox" className="h-5 w-5 shrink-0 accent-emerald-600" checked={on} onChange={() => toggle(r.id)} aria-label="Chọn buổi" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{dateVN(r.played_on)}</span>
                    {r.is_paid ? <Badge tone="green">Đã thanh toán</Badge> : <Badge tone="amber">Chưa thanh toán</Badge>}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    {r.location || "Chưa có địa điểm"} · {r.session_players.length} người · {r.shuttle_count} quả cầu
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700">{money(sessionTotal(r))}</div>
                  <Link href={`/teams/${teamId}/sessions/${r.id}`} className="text-sm text-slate-500 underline">Sửa</Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {sel.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <span className="text-sm">Đã chọn <b>{sel.size}</b> buổi</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSel(new Set())}>Bỏ chọn</Button>
              <Button onClick={pay}>💳 Thanh toán</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
