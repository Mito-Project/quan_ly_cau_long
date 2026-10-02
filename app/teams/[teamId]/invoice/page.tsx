"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase, qrUrl } from "@/lib/supabase";
import type { Session, Team } from "@/lib/types";
import { dateVN, money, perPlayer, sessionTotal, shuttleTotal } from "@/lib/format";
import { Button, ErrorText } from "@/components/ui";

type Row = Session & { session_players: { player_id: string; players: { name: string } | null }[] };

function Invoice() {
  const { teamId } = useParams<{ teamId: string }>();
  const ids = (useSearchParams().get("ids") ?? "").split(",").filter(Boolean);
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("teams").select("*").eq("id", teamId).single();
      setTeam(t as Team);
      const { data, error } = await supabase.from("sessions")
        .select("*, session_players(player_id, players(name))")
        .in("id", ids).order("played_on");
      if (error) setErr(error.message);
      setRows((data as unknown as Row[]) ?? []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const share = perPlayer(r, r.session_players.length);
      r.session_players.forEach((sp) => {
        const n = sp.players?.name ?? "(đã xóa)";
        m.set(n, (m.get(n) ?? 0) + share);
      });
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi"));
  }, [rows]);

  const grand = rows.reduce((s, r) => s + sessionTotal(r), 0);
  const img = qrUrl(team?.qr_path ?? null);

  const markPaid = async () => {
    const { error } = await supabase.from("sessions").update({ is_paid: true, paid_at: new Date().toISOString() }).in("id", ids);
    if (error) setErr(error.message); else setDone(true);
  };

  if (loading) return <p className="text-slate-500">Đang tải…</p>;
  if (!rows.length) return <p className="text-slate-500">Không có buổi chơi nào được chọn.</p>;

  return (
    <div>
      <div className="no-print mb-4 space-y-3">
        <ErrorText msg={err} />
        {done && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Đã đánh dấu {rows.length} buổi là đã thanh toán ✔</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => router.push(`/teams/${teamId}/sessions`)}>← Quay lại</Button>
          <Button onClick={() => window.print()}>📄 Lưu PDF / In</Button>
          <Button variant="ghost" onClick={markPaid} disabled={done}>✅ Đánh dấu đã thanh toán</Button>
        </div>
        <p className="text-xs text-slate-500">Bấm “Lưu PDF / In” rồi chọn <b>Lưu dưới dạng PDF</b> (Save as PDF) ở mục máy in.</p>
      </div>

      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-sm sm:p-8 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="mb-5 border-b pb-4">
          <h1 className="text-2xl font-bold">🏸 {team?.name}</h1>
          <p className="text-slate-500">Bảng thanh toán · {rows.length} buổi · xuất ngày {new Date().toLocaleDateString("vi-VN")}</p>
        </header>

        <div className="space-y-5">
          {rows.map((r, i) => {
            const n = r.session_players.length;
            const share = perPlayer(r, n);
            return (
              <section key={r.id} className="print-break rounded-xl border p-4">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
                  <h2 className="font-semibold">Buổi {i + 1}: {dateVN(r.played_on)}</h2>
                  <span className="text-sm text-slate-500">{r.location}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className="py-0.5">Giá sân</td><td className="text-right">{money(r.court_price)}</td></tr>
                    <tr><td className="py-0.5">Giá cầu: {money(r.shuttle_price)} × {r.shuttle_count} quả</td><td className="text-right">{money(shuttleTotal(r))}</td></tr>
                    <tr className="border-t font-semibold"><td className="py-1">Tổng buổi chơi</td><td className="text-right">{money(sessionTotal(r))}</td></tr>
                  </tbody>
                </table>
                <div className="mt-2 text-sm">
                  <div className="mb-1 text-slate-500">Người chơi ({n}) · mỗi người {money(share)}</div>
                  {n === 0 ? <i className="text-slate-400">Chưa chọn người chơi</i> : (
                    <div className="flex flex-wrap gap-1.5">
                      {r.session_players.map((sp) => (
                        <span key={sp.player_id} className="rounded-full bg-slate-100 px-2.5 py-0.5">{sp.players?.name ?? "(đã xóa)"}</span>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <section className="print-break mt-6">
          <h2 className="mb-2 text-lg font-bold">Tổng tiền từng người</h2>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-left"><th className="p-2">Người chơi</th><th className="p-2 text-right">Cần thanh toán</th></tr></thead>
            <tbody>
              {totals.map(([name, amount]) => (
                <tr key={name} className="border-b"><td className="p-2">{name}</td><td className="p-2 text-right font-semibold">{money(amount)}</td></tr>
              ))}
              {totals.length === 0 && <tr><td colSpan={2} className="p-2 text-slate-400">Chưa có người chơi</td></tr>}
            </tbody>
            <tfoot><tr className="font-bold"><td className="p-2">Tổng chi phí các buổi</td><td className="p-2 text-right">{money(grand)}</td></tr></tfoot>
          </table>
        </section>

        {img && (
          <section className="print-break mt-6 flex flex-col items-center border-t pt-5">
            <p className="mb-2 font-medium">Quét mã QR để thanh toán</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="QR ngân hàng" className="max-h-80 object-contain" />
          </section>
        )}
      </article>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="text-slate-500">Đang tải…</p>}><Invoice /></Suspense>;
}
