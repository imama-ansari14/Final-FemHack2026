"use client";

const STYLES = {
  New: "bg-slate-100 text-slate-700 border-slate-200",
  Assigned: "bg-teal-50 text-teal-700 border-teal-100",
  "In Progress": "bg-amber-50 text-amber-600 border-amber-100",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || STYLES.New;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
