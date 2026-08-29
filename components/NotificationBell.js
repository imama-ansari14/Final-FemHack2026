"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "../lib/socketClient";

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  function load() {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    function onNew({ notification }) {
      setNotifications((prev) => [notification, ...prev]);
    }
    socket.on("notification:new", onNew);
    return () => socket.off("notification:new", onNew);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleClick(n) {
    if (!n.read) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n._id }),
      });
      setNotifications((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    }
    setOpen(false);
    if (n.ticket?._id) router.push(`/customer/tickets/${n.ticket._id}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-coral-500 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          {notifications.length === 0 ? (
            <p className="p-3 text-sm text-slate-400">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleClick(n)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                  n.read ? "text-slate-500" : "font-medium text-ink-900"
                }`}
              >
                {n.message}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}