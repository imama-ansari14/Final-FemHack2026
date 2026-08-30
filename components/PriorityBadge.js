"use client";

const STYLES = {
  Low: "bg-slate-100 text-slate-600 border-slate-200",
  Medium: "bg-amber-50 text-amber-600 border-amber-100",
  High: "bg-coral-50 text-coral-600 border-coral-100",
};

const DOT = {
  Low: "bg-slate-400",
  Medium: "bg-amber-400",
  High: "bg-coral-400",
};

export default function PriorityBadge({ priority }) {
  const cls = STYLES[priority] || STYLES.Medium;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[priority] || DOT.Medium}`} />
      {priority}
    </span>
  );
}
