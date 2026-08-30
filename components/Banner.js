"use client";

export default function Banner({ type = "error", children }) {
  if (!children) return null;
  const styles =
    type === "error"
      ? "bg-coral-50 text-coral-600 border-coral-100"
      : type === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-teal-50 text-teal-700 border-teal-100";
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles}`} role="status">
      {children}
    </div>
  );
}
