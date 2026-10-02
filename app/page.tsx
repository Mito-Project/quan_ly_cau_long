"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => router.replace(data.session ? "/teams" : "/login"));
  }, [router]);
  return <div className="p-10 text-center text-slate-500">Đang tải…</div>;
}
