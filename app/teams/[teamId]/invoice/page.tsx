"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase, qrUrl } from "@/lib/supabase";
import type { Meal, Session, Team } from "@/lib/types";
import { dateVN, mealShare, money, perPlayer, sessionTotal, shuttleTotal } from "@/lib/format";
import { Button, ErrorText } from "@/components/ui";

type SRow = Session & { session_players: { player_id: string; players: { name: string } | null }[] };
type MRow = Meal & { meal_players: { player_id: string; players: { name: string } | null }[] };

function Invoice() {
  const { teamId } = useParams<{ teamId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const idsKey = sp.get("ids") ?? "";
  const mealsKey = sp.get("meals") ?? "";
  const ids = useMemo(() => idsKey.split(",").filter(Boolean), [idsKey]);
  const mealIds = useMemo(() => mealsKey.split(",").filter(Boolean), [mealsKey]);

  const [team, setTeam] = useState<Team | null>(null);
  const [rows, setRows] = useState<SRow[]>([]);
  const [meals, setMeals] = useState<MRow[]>([]);
  const [extraS, setExtraS] = useState<string[]>([]); // buổi chơi chưa thanh toán chưa nằm trong hóa đơn
  const [extraM, setExtraM] = useState<string[]>([]); // buổi ăn chưa thanh toán chưa nằm trong hóa đơn
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true); setDone(false);
      const { data: t } = await supabase.from("teams").select("*").eq("id", teamId).single();
      setTeam(t as Team);

      let s: SRow[] = [], m: MRow[] = [];
      if (ids.length) {
        const { data, error } = await supabase.from("sessions").select("*, session_players(player_id, players(name))").in("id", ids).order("played_on");
        if (error) setErr(error.message);
        s = (data as unknown as SRow[]) ?? [];
      }
      if (mealIds.length) {
        const { data, error } = await supabase.from("meals").select("*, meal_players(player_id, players(name))").in("id", mealIds).order("eaten_on");
        if (error) setErr(error.message);
        m = (data as unknown as MRow[]) ?? [];
      }
      setRows(s); setMeals(m);

      const { data: us } = await supabase.from("sessions").select("id").eq("team_id", teamId).eq("is_paid", false);
      const { data: um } = await supabase.from("meals").select("id").eq("team_id", teamId).eq("is_paid", false);
      setExtraS((us ?? []).map((x) => x.id).filter((id) => !ids.includes(id)));
      setExtraM((um ?? []).map((x) => x.id).filter((id) => !mealIds.includes(id)));
      setLoading(false);
    })();
  }, [teamId, ids, mealIds]);

  const go = (s: string[], m: string[]) => {
    const q = new URLSearchParams();
    if (s.length) q.set("ids", s.join(","));
    if (m.length) q.set("meals", m.join(","));
    router.replace(`/teams/${teamId}/invoice?${q.toString()}`);
  };

  const hasS = rows.length > 0, hasM = meals.length > 0;

  const totals = useMemo(() => {
    const map = new Map<string, { name: string; play: number; meal: number }>();
    const get = (pid: string, name: string) => {
      if (!map.has(pid)) map.set(pid, { name, play: 0, meal: 0 });
      return map.get(pid)!;
    };
    rows.forEach((r) => {
      const share = perPlayer(r, r.session_players.length);
      r.session_players.forEach((x) => { get(x.player_id, x.players?.name ?? "(đã xóa)").play += share; });
    });
    meals.forEach((m) => {
      const share = mealShare(m.total_amount, m.meal_players.length);
      m.meal_players.forEach((x) => { get(x.player_id, x.players?.name ?? "(đã xóa)").meal += share; });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [rows, meals]);

  const grandPlay = rows.reduce((s, r) => s + sessionTotal(r), 0);
  const grandMeal = meals.reduce((s, m) => s + m.total_amount, 0);
  const img = qrUrl(team?.qr_path ?? null);

  const markPaid = async () => {
    const now = new Date().toISOString();
    if (ids.length) {
      const { error } = await supabase.from("sessions").update({ is_paid: true, paid_at: now }).in("id", ids);
      if (error) return setErr(error.message);
    }
    if (mealIds.length) {
      const { error } = await supabase.from("meals").update({ is_paid: true, paid_at: now }).in("id", mealIds);
      if (error) return setErr(error.message);
    }
    setDone(true);
  };

  if (loading) return <p className="text-slate-500">Đang tải…</p>;
  if (!hasS && !hasM) return <p className="text-slate-500">Không có buổi nào được chọn.</p>;

  return (
    <div>
      <div className="no-print mb-4 space-y-3">
        <ErrorText msg={err} />
        {done && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Đã đánh dấu {rows.length + meals.length} buổi là đã thanh toán ✔</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => router.push(`/teams/${teamId}/${hasS ? "sessions" : "meals"}`)}>← Quay lại</Button>
          <Button onClick={() => window.print()}>📄 Lưu PDF / In</Button>
          <Button variant="ghost" onClick={markPaid} disabled={done}>✅ Đánh dấu đã thanh toán</Button>
        </div>
        {(extraM.length > 0 && !hasM) || (extraS.length > 0 && !hasS) ? (
          <div className="flex flex-wrap gap-2">
            {!hasM && extraM.length > 0 && <Button variant="ghost" onClick={() => go(ids, extraM)}>➕ Gộp {extraM.length} buổi ăn chưa thanh toán</Button>}
            {!hasS && extraS.length > 0 && <Button variant="ghost" onClick={() => go(extraS, mealIds)}>➕ Gộp {extraS.length} buổi chơi chưa thanh toán</Button>}
          </div>
        ) : null}
        <p className="text-xs text-slate-500">Bấm “Lưu PDF / In” rồi chọn <b>Lưu dưới dạng PDF</b> (Save as PDF) ở mục máy in.</p>
      </div>

      <article className="mx-auto max-w-3xl rounded-2xl bg-white p-5 shadow-sm sm:p-8 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="mb-5 border-b pb-4">
          <h1 className="text-2xl font-bold">🏸 {team?.name}</h1>
          <p className="text-slate-500">
            Bảng thanh toán · {hasS && `${rows.length} buổi chơi`}{hasS && hasM && " + "}{hasM && `${meals.length} buổi ăn`} · xuất ngày {new Date().toLocaleDateString("vi-VN")}
          </p>
        </header>

        <div className="space-y-5">
          {rows.map((r, i) => {
            const n = r.session_players.length;
            const share = perPlayer(r, n);
            return (
              <section key={r.id} className="print-break rounded-xl border p-4">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
                  <h2 className="font-semibold">🏸 Buổi chơi {i + 1}: {dateVN(r.played_on)}</h2>
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
                      {r.session_players.map((x) => <span key={x.player_id} className="rounded-full bg-slate-100 px-2.5 py-0.5">{x.players?.name ?? "(đã xóa)"}</span>)}
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {meals.map((m, i) => {
            const n = m.meal_players.length;
            return (
              <section key={m.id} className="print-break rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
                  <h2 className="font-semibold">🍜 Buổi ăn {i + 1}: {dateVN(m.eaten_on)}</h2>
                  <span className="text-sm text-slate-500">{m.title}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody><tr className="font-semibold"><td className="py-1">Tổng tiền buổi ăn</td><td className="text-right">{money(m.total_amount)}</td></tr></tbody>
                </table>
                <div className="mt-2 text-sm">
                  <div className="mb-1 text-slate-500">Người ăn ({n}) · mỗi người {money(mealShare(m.total_amount, n))}</div>
                  {n === 0 ? <i className="text-slate-400">Chưa chọn người ăn</i> : (
                    <div className="flex flex-wrap gap-1.5">
                      {m.meal_players.map((x) => <span key={x.player_id} className="rounded-full bg-white px-2.5 py-0.5 ring-1 ring-amber-200">{x.players?.name ?? "(đã xóa)"}</span>)}
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
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="p-2">Người</th>
                {hasS && hasM && <th className="p-2 text-right">Tiền chơi</th>}
                {hasS && hasM && <th className="p-2 text-right">Tiền ăn</th>}
                <th className="p-2 text-right">Cần thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((t) => (
                <tr key={t.name} className="border-b">
                  <td className="p-2">{t.name}</td>
                  {hasS && hasM && <td className="p-2 text-right">{money(t.play)}</td>}
                  {hasS && hasM && <td className="p-2 text-right">{money(t.meal)}</td>}
                  <td className="p-2 text-right font-semibold">{money(t.play + t.meal)}</td>
                </tr>
              ))}
              {totals.length === 0 && <tr><td colSpan={4} className="p-2 text-slate-400">Chưa có người tham gia</td></tr>}
            </tbody>
            <tfoot>
              {hasS && hasM && <tr className="text-slate-600"><td className="p-2" colSpan={3}>Tổng tiền chơi</td><td className="p-2 text-right">{money(grandPlay)}</td></tr>}
              {hasS && hasM && <tr className="text-slate-600"><td className="p-2" colSpan={3}>Tổng tiền ăn</td><td className="p-2 text-right">{money(grandMeal)}</td></tr>}
              <tr className="font-bold"><td className="p-2" colSpan={hasS && hasM ? 3 : 1}>Tổng chi phí</td><td className="p-2 text-right">{money(grandPlay + grandMeal)}</td></tr>
            </tfoot>
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
