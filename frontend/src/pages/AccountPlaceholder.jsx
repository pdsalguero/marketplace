import React from "react";

export default function AccountPlaceholder({ title = "Pronto…" }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-gray-500">Pronto…</p>
    </div>
  );
}
