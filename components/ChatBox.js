"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socketClient";

export default function ChatBox({ ticketId, currentUser, initialMessages, onTicketUpdate, disabled }) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [typingName, setTypingName] = useState("");
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  useEffect(() => {
    setMessages(initialMessages || []);
  }, [initialMessages]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join-ticket", ticketId);

    function onNewMessage({ message, ticket }) {
      setMessages((prev) => [...prev, message]);
      if (ticket && onTicketUpdate) onTicketUpdate(ticket);
    }
    function onTyping({ name }) {
      setTypingName(name);
      setTimeout(() => setTypingName(""), 2000);
    }

    socket.on("message:new", onNewMessage);
    socket.on("typing", onTyping);

    return () => {
      socket.emit("leave-ticket", ticketId);
      socket.off("message:new", onNewMessage);
      socket.off("typing", onTyping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleTyping() {
    const socket = getSocket();
    clearTimeout(typingTimeout.current);
    socket.emit("typing", { ticketId, name: currentUser.name });
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send message.");
      setDraft("");
      // The socket "message:new" event will add it to the list for everyone,
      // including us, so we don't need to append it manually here.
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-1 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No messages yet. Say hello 👋</p>
        )}
        {messages.map((m) => {
          const mine = (m.sender?._id || m.sender) === currentUser.id;
          return (
            <div key={m._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-card ${
                  mine ? "bg-ink-900 text-white" : "bg-white text-ink-900 border border-slate-200"
                }`}
              >
                <p className={`mb-0.5 text-[11px] font-medium ${mine ? "text-slate-300" : "text-slate-400"}`}>
                  {mine ? "You" : m.sender?.name || "Unknown"} · <span className="capitalize">{m.senderRole}</span>
                </p>
                <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {typingName && typingName !== currentUser.name && (
        <p className="px-1 pb-1 text-xs italic text-slate-400">{typingName} is typing…</p>
      )}

      {error && <p className="px-1 pb-1 text-xs text-coral-600">{error}</p>}

      <form onSubmit={sendMessage} className="mt-1 flex gap-2 border-t border-slate-200 pt-3">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            handleTyping();
          }}
          disabled={disabled}
          placeholder={disabled ? "Reopen the ticket to keep messaging" : "Type a message…"}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="submit"
          disabled={disabled || sending || !draft.trim()}
          className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
