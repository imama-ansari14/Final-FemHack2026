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

const CATEGORIES = ["Billing", "Technical", "Account", "Shipping", "General"];
const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = ["New", "Assigned", "In Progress", "Resolved"];

function AgentTicketDetail({ user }) {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [triage, setTriage] = useState({ category: "", priority: "", summary: "" });
  const [resolutionNote, setResolutionNote] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);

  function load() {
    fetch(`/api/tickets/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setTicket(data.ticket);
          setMessages(data.messages);
          setTriage({ category: data.ticket.category, priority: data.ticket.priority, summary: data.ticket.summary });
        }
      })
      .catch(() => setError("Could not load this ticket."));
  }

  useEffect(load, [id]);

  useEffect(() => {
    const socket = getSocket();
    function onTicketUpdated({ ticket: updated }) {
      if (updated && updated._id === id) {
        setTicket(updated);
        setTriage({ category: updated.category, priority: updated.priority, summary: updated.summary });
      }
    }
    socket.on("ticket:updated", onTicketUpdated);
    return () => socket.off("ticket:updated", onTicketUpdated);
  }, [id]);

  async function saveTriage() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(triage),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Could not save triage."
        );
      }

      setTicket(data.ticket);

      setSuccess("Triage saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }



  async function changeStatus(status) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tickets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update status.");
      setTicket(data.ticket);
      setSuccess(`Status changed to ${status}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function resolveTicket(e) {
    e.preventDefault();
    if (!resolutionNote.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tickets/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved", resolutionNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resolve ticket.");
      setTicket(data.ticket);
      setShowResolveForm(false);
      setSuccess("Ticket resolved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !ticket) {
    return (
      <div className="min-h-screen">
        <Navbar user={user} />
        <main className="mx-auto max-w-4xl px-5 py-8">
          <Banner type="error">{error}</Banner>
        </main>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen">
        <Navbar user={user} />
        <LoadingSpinner label="Loading ticket…" />
      </div>
    );
  }

  const isMine = ticket.assignedAgent?._id === user.id || ticket.assignedAgent === user.id;

  return (
    <div className="min-h-screen">
      <Navbar user={user} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-mono text-xs text-slate-400">{ticket.ticketNumber}</span>
            <h1 className="text-xl font-semibold text-ink-900">{ticket.subject}</h1>
          </div>
          <div className="flex items-center gap-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <Banner type="error">{error}</Banner>
          </div>
        )}
        {success && (
          <div className="mb-4">
            <Banner type="success">{success}</Banner>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: ticket + AI triage + controls */}
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="mb-2 text-sm font-semibold text-ink-900">Customer's message</h2>
              <p className="mb-1 text-xs text-slate-500">From {ticket.customer?.name}</p>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{ticket.description}</p>
            </div>

            <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-5 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-900">AI triage suggestion</h2>
                {ticket.aiSuggestion?.aiAvailable === false && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                    AI unavailable — fallback used
                  </span>
                )}
              </div>
              <p className="mb-4 text-xs text-slate-500">
                Original AI output: <span className="font-medium">{ticket.aiSuggestion?.category}</span> ·{" "}
                <span className="font-medium">{ticket.aiSuggestion?.priority}</span> — &ldquo;
                {ticket.aiSuggestion?.summary}&rdquo;
              </p>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
                  <select
                    value={triage.category}
                    onChange={(e) => setTriage({ ...triage, category: e.target.value })}
                    disabled={ticket.status === "Resolved"}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Priority</label>
                  <select
                    value={triage.priority}
                    onChange={(e) => setTriage({ ...triage, priority: e.target.value })}
                    disabled={ticket.status === "Resolved"}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Summary</label>
                  <textarea
                    rows={3}
                    value={triage.summary}
                    onChange={(e) => setTriage({ ...triage, summary: e.target.value })}
                    disabled={ticket.status === "Resolved"}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
                  />
                </div>

                <div className="pt-1"> {isMine && ticket.status !== "Resolved" && (<button onClick={saveTriage} disabled={saving} className="w-full rounded-lg bg-ink-900 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50" > {saving ? "Saving..." : "Save triage"} </button>)} {!isMine && ticket.assignedAgent && (<p className="text-xs text-slate-500"> Assigned to{" "} <span className="font-medium text-slate-700"> {ticket.assignedAgent.name} </span> . Only the assigned worker can edit triage. </p>)} </div>

                {!isUnassigned && !isMine && (
                  <p className="text-xs text-slate-500">
                    Assigned to {ticket.assignedAgent?.name}. Only they can edit triage.
                  </p>
                )}
              </div>
            </div>

            {isMine && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
                <h2 className="mb-3 text-sm font-semibold text-ink-900">Status</h2>
                {ticket.status !== "Resolved" ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.filter((s) => s !== "Resolved").map((s) => (
                        <button
                          key={s}
                          onClick={() => changeStatus(s)}
                          disabled={saving || ticket.status === s}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${ticket.status === s
                            ? "border-ink-900 bg-ink-900 text-white"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {!showResolveForm ? (
                      <button
                        onClick={() => setShowResolveForm(true)}
                        className="w-full rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Resolve ticket
                      </button>
                    ) : (
                      <form onSubmit={resolveTicket} className="space-y-2 pt-1">
                        <textarea
                          required
                          rows={3}
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          placeholder="Resolution note (required) — what did you do to fix this?"
                          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Confirm resolve
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowResolveForm(false)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Banner type="success">
                      <strong>Resolution note:</strong> {ticket.resolutionNote}
                    </Banner>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: conversation */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="mb-2 text-sm font-semibold text-ink-900">Conversation</h2>
              <div className="h-[560px]">
                <ChatBox
                  ticketId={id}
                  currentUser={user}
                  initialMessages={messages}
                  onTicketUpdate={setTicket}
                  disabled={ticket.status === "Resolved" || (!isMine && !isUnassigned)}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AgentTicketPage() {
  return <RequireAuth allowRoles={["agent", "admin"]}>{(user) => <AgentTicketDetail user={user} />}</RequireAuth>;
}
