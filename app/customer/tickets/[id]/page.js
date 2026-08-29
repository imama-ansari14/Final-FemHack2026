"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RequireAuth from "../../../../components/RequireAuth";
import Navbar from "../../../../components/Navbar";
import ChatBox from "../../../../components/ChatBox";
import StatusBadge from "../../../../components/StatusBadge";
import PriorityBadge from "../../../../components/PriorityBadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import Banner from "../../../../components/Banner";
import { getSocket } from "../../../../lib/socketClient";

function ReviewForm({ ticketId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!rating) return setError("Please select a star rating.");
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${ticketId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit review.");
      onSubmitted(data.ticket);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-teal-100 bg-teal-50/40 p-4">
      <p className="text-sm font-semibold text-ink-900">Rate this resolution</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => setRating(n)}
            className={`text-2xl transition ${n <= rating ? "text-amber-400" : "text-slate-300"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment…"
        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
      />
      {error && <Banner type="error">{error}</Banner>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-ink-800 disabled:opacity-50"
      >
        {saving ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}

function TicketDetail({ user }) {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/tickets/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setTicket(data.ticket);
          setMessages(data.messages);
        }
      })
      .catch(() => setError("Could not load this ticket."));
  }, [id]);

  useEffect(() => {
    const socket = getSocket();
    function onTicketUpdated({ ticket: updated }) {
      if (updated && updated._id === id) setTicket(updated);
    }
    socket.on("ticket:updated", onTicketUpdated);
    return () => socket.off("ticket:updated", onTicketUpdated);
  }, [id]);

  return (
    <div className="min-h-screen">
      <Navbar user={user} />
      <main className="mx-auto max-w-4xl px-5 py-8">
        {error && <Banner type="error">{error}</Banner>}
        {!ticket && !error && <LoadingSpinner label="Loading ticket…" />}

        {ticket && (
          <>
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-400">{ticket.ticketNumber}</span>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={ticket.priority} />
                  <StatusBadge status={ticket.status} />
                </div>
              </div>
              <h1 className="mb-1 text-xl font-semibold text-ink-900">{ticket.subject}</h1>
              <p className="mb-3 whitespace-pre-wrap text-sm text-slate-600">{ticket.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium">{ticket.category}</span>
                {ticket.assignedAgent ? (
                  <span>Assigned to {ticket.assignedAgent.name}</span>
                ) : (
                  <span>Waiting for a worker to pick this up</span>
                )}
              </div>
              {ticket.status === "Resolved" && ticket.resolutionNote && (
                <div className="mt-4">
                  <Banner type="success">
                    <strong>Resolved:</strong> {ticket.resolutionNote}
                  </Banner>
                </div>
              )}

              {ticket.status === "Resolved" && !ticket.review?.rating && (
                <ReviewForm ticketId={id} onSubmitted={setTicket} />
              )}
              {ticket.review?.rating && (
                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                  <p className="text-sm font-medium text-ink-900">
                    Your rating: {"★".repeat(ticket.review.rating)}
                    {"☆".repeat(5 - ticket.review.rating)}
                  </p>
                  {ticket.review.comment && <p className="mt-1 text-sm text-slate-600">{ticket.review.comment}</p>}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="mb-2 text-sm font-semibold text-ink-900">Conversation</h2>
              <div className="h-[420px]">
                <ChatBox
                  ticketId={id}
                  currentUser={user}
                  initialMessages={messages}
                  onTicketUpdate={setTicket}
                  disabled={ticket.status === "Resolved"}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function CustomerTicketPage() {
  return <RequireAuth allowRoles={["customer"]}>{(user) => <TicketDetail user={user} />}</RequireAuth>;
}