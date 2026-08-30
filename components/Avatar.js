"use client";

export default function Avatar({ user, size = 36 }) {
  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (user?.avatarDataUrl) {
    return (
      <img
        src={user.avatarDataUrl}
        alt={user.name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover ring-1 ring-slate-200"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-teal-500 text-xs font-semibold text-white ring-1 ring-slate-200"
    >
      {initials}
    </div>
  );
}