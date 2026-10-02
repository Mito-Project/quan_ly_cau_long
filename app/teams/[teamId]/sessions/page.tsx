"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Session } from "@/lib/types";
import { dateVN, money, sessionTotal } from "@/lib/format";
import { Badge, Button, Card, ErrorText } from "@/components/ui";

type Row = Session & { session_players: { player_id: string }[] };
type Mode = "all" | "week" | "month" | "year" | "custom";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

// Khoảng ngày theo tuần (T2–CN) / tháng / năm, offset: 0 = hiện tại, -1 = kỳ trước, +1 = kỳ sau
function getRange(mode: "week" | "month" | "year", offset: number) {
  const now = new Date();
  if (mode === "week") {
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - ((now.getDay() + 6) % 7) + offset * 7,
    );
    const end = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 6,
    );
    return {
      from: iso(start),
      to: iso(end),
      label: `Tuần ${dm(start)} – ${dm(end)}/${end.getFullYear()}`,
    };
  }
  if (mode === "month") {
    const s = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
    return {
      from: iso(s),
      to: iso(e),
      label: `Tháng ${s.getMonth() + 1}/${s.getFullYear()}`,
    };
  }
  const y = now.getFullYear() + offset;
  return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Năm ${y}` };
}

export default function SessionsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"all" | "unpaid" | "paid">("all");
  const [mode, setMode] = useState<Mode>("all");
  const [offset, setOffset] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase
      .from("sessions")
      .select("*, session_players(player_id)")
      .eq("team_id", teamId)
      .order("played_on", { ascending: false })
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        setRows((data as Row[]) ?? []);
        setLoading(false);
      });
  }, [teamId]);

  const range = useMemo(() => {
    if (mode === "all") return { from: "", to: "", label: "" };
    if (mode === "custom") return { from, to, label: "" };
    return getRange(mode, offset);
  }, [mode, offset, from, to]);

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (status === "all" || (status === "paid") === r.is_paid) &&
          (!range.from || r.played_on >= range.from) &&
          (!range.to || r.played_on <= range.to),
      ),
    [rows, status, range],
  );

  // chỉ tính các buổi đang hiển thị, tránh thanh toán nhầm buổi đã bị lọc ẩn
  const selShown = useMemo(
    () => shown.filter((r) => sel.has(r.id)).map((r) => r.id),
    [shown, sel],
  );
  const allOn = shown.length > 0 && selShown.length === shown.length;

  const sumAll = shown.reduce((s, r) => s + sessionTotal(r), 0);
  const sumUnpaid = shown
    .filter((r) => !r.is_paid)
    .reduce((s, r) => s + sessionTotal(r), 0);

  const toggle = (id: string) =>
    setSel((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSel((p) => {
      const n = new Set(p);
      shown.forEach((r) => (allOn ? n.delete(r.id) : n.add(r.id)));
      return n;
    });
  const pay = () =>
    router.push(`/teams/${teamId}/invoice?ids=${selShown.join(",")}`);

  const changeMode = (m: Mode) => {
    setMode(m);
    setOffset(0);
  };
  const filtering = mode !== "all" || status !== "all";
  const resetFilters = () => {
    setMode("all");
    setOffset(0);
    setFrom("");
    setTo("");
    setStatus("all");
  };

  const seg = "flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 text-sm";
  const segBtn = (on: boolean) =>
    `whitespace-nowrap rounded-lg px-3 py-1.5 transition ${on ? "bg-white font-medium shadow-sm" : "text-slate-500"}`;
  const dateInput =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Buổi chơi</h2>
        <Link href={`/teams/${teamId}/sessions/new`}>
          <Button>+ Tạo buổi</Button>
        </Link>
      </div>

      {/* ---------- BỘ LỌC ---------- */}
      <Card className="mb-3 space-y-3">
        <div className={seg}>
          {(
            [
              ["all", "Tất cả"],
              ["week", "Tuần"],
              ["month", "Tháng"],
              ["year", "Năm"],
              ["custom", "Từ – đến"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => changeMode(k)}
              className={segBtn(mode === k)}
            >
              {l}
            </button>
          ))}
        </div>

        {(mode === "week" || mode === "month" || mode === "year") && (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setOffset(offset - 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-lg hover:bg-slate-50"
              aria-label="Kỳ trước"
            >
              ‹
            </button>
            <div className="text-center">
              <div className="font-semibold">{range.label}</div>
              {offset === 0 ? (
                <div className="text-xs text-emerald-600">Hiện tại</div>
              ) : (
                <button
                  onClick={() => setOffset(0)}
                  className="text-xs text-slate-500 underline"
                >
                  Về hiện tại
                </button>
              )}
            </div>
            <button
              onClick={() => setOffset(offset + 1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-lg hover:bg-slate-50"
              aria-label="Kỳ sau"
            >
              ›
            </button>
          </div>
        )}

        {mode === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-slate-600">
              Từ ngày
              <input
                type="date"
                className={`mt-1 ${dateInput}`}
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="block text-sm text-slate-600">
              Đến ngày
              <input
                type="date"
                className={`mt-1 ${dateInput}`}
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className={seg}>
            {(
              [
                ["all", "Mọi trạng thái"],
                ["unpaid", "Chưa thanh toán"],
                ["paid", "Đã thanh toán"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setStatus(k)}
                className={segBtn(status === k)}
              >
                {l}
              </button>
            ))}
          </div>
          {filtering && (
            <button
              onClick={resetFilters}
              className="text-sm text-slate-500 underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </Card>

      {/* ---------- TÓM TẮT + CHỌN HẾT ---------- */}
      <div className="mb-3 flex items-center justify-between gap-2 text-sm">
        <div className="text-slate-600">
          <b>{shown.length}</b> buổi · tổng <b>{money(sumAll)}</b>
          {sumUnpaid > 0 && (
            <span className="text-amber-700">
              {" "}
              · chưa thanh toán <b>{money(sumUnpaid)}</b>
            </span>
          )}
        </div>
        {shown.length > 0 && (
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              className="h-5 w-5 accent-emerald-600"
              checked={allOn}
              onChange={toggleAll}
            />{" "}
            Chọn hết
          </label>
        )}
      </div>

      <ErrorText msg={err} />
      {loading ? (
        <p className="text-slate-500">Đang tải…</p>
      ) : shown.length === 0 ? (
        <Card className="text-center text-slate-500">
          {rows.length === 0
            ? "Chưa có buổi chơi nào."
            : "Không có buổi chơi nào khớp bộ lọc."}
        </Card>
      ) : (
        <div className="space-y-2.5">
          {shown.map((r) => {
            const on = sel.has(r.id);
            return (
              <Card
                key={r.id}
                className={`flex items-center gap-3 transition ${on ? "!border-emerald-400 bg-emerald-50/50" : ""}`}
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-emerald-600"
                  checked={on}
                  onChange={() => toggle(r.id)}
                  aria-label="Chọn buổi"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{dateVN(r.played_on)}</span>
                    {r.is_paid ? (
                      <Badge tone="green">Đã thanh toán</Badge>
                    ) : (
                      <Badge tone="amber">Chưa thanh toán</Badge>
                    )}
                  </div>
                  <div className="truncate text-sm text-slate-500">
                    {r.location || "Chưa có địa điểm"} ·{" "}
                    {r.session_players.length} người · {r.shuttle_count} quả cầu
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-700">
                    {money(sessionTotal(r))}
                  </div>
                  <Link
                    href={`/teams/${teamId}/sessions/${r.id}`}
                    className="text-sm text-slate-500 underline"
                  >
                    Sửa
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {selShown.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <span className="text-sm">
              Đã chọn <b>{selShown.length}</b> buổi
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSel(new Set())}>
                Bỏ chọn
              </Button>
              <Button onClick={pay}>💳 Thanh toán</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
