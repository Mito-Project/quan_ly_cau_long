"use client";
import React from "react";

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};
export function Button({ variant = "primary", className = "", ...p }: BtnProps) {
  const v = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    ghost: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${v} ${className}`}
    />
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: React.ReactNode };
export function Field({ label, hint, className = "", ...p }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      <input
        {...p}
        className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 ${className}`}
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "green" | "amber" }) {
  const t = { gray: "bg-slate-100 text-slate-600", green: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700" }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="Đóng">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorText({ msg }: { msg: string }) {
  return msg ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{msg}</p> : null;
}
