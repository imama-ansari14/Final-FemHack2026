"use client";

import { useRouter } from "next/navigation";

export default function Navbar({ user }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900">
            <span className="font-mono text-sm font-semibold text-teal-400">SF</span>
          </div>
          <span className="font-semibold tracking-tight text-ink-900">SupportFlow</span>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-ink-900">{user.name}</p>
              <p className="text-xs capitalize text-slate-500">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
