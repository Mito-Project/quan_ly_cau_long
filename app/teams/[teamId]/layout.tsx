"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AuthGuard from "@/components/AuthGuard";

function Shell({ children }: { children: React.ReactNode }) {
  const { teamId } = useParams<{ teamId: string }>();
  const pathname = usePathname();
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.from("teams").select("name").eq("id", teamId).single().then(({ data }) => setName(data?.name ?? ""));
  }, [teamId]);

  const tabs = [
    { href: `/teams/${teamId}/sessions`, label: "📅 Buổi chơi" },
    { href: `/teams/${teamId}/players`, label: "👥 Lông thủ" },
    { href: `/teams/${teamId}/settings`, label: "⚙️ Cài đặt" },
  ];

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-400">Team</div>
            <div className="truncate text-lg font-bold">🏸 {name || "…"}</div>
          </div>
          <Link href="/teams" className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">Đổi team</Link>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4 pb-3">
          {tabs.map((t) => {
            const active = pathname.startsWith(t.href);
            return (
              <Link key={t.href} href={t.href}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl p-4 pb-24">{children}</main>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><Shell>{children}</Shell></AuthGuard>;
}
