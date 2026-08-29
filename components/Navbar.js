"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import NotificationBell from "./NotificationBell";

export default function Navbar({ user, onUserUpdate }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploading(true);
    setError("");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/auth/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarDataUrl: reader.result }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not update photo.");
        onUserUpdate?.(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
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
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-coral-600">{error}</span>}
            {user.role === "customer" && <NotificationBell />}
            <button
              onClick={handleAvatarClick}
              title="Change profile picture"
              className="relative rounded-full transition hover:opacity-80"
            >
              <Avatar user={user} size={36} />
              {uploading && (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
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