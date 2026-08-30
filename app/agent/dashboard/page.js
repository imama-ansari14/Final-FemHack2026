"use client";

import { useEffect, useState } from "react";
import RequireAuth from "../../../components/RequireAuth";
import Navbar from "../../../components/Navbar";
import TicketCard from "../../../components/TicketCard";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Banner from "../../../components/Banner";
import { getSocket } from "../../../lib/socketClient";

const FILTERS = ["All", "Unassigned", "Mine", "In Progress", "Resolved"];

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent || "text-ink-900"}`}>{value}</p>
    </div>
  );
}

function Dashboard({ user }) {
  const [tickets, setTickets] = useState(null);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");

  function loadTickets() {
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTickets(data.tickets);
      })
      .catch(() => setError("Could not load tickets."));
  }

  function loadStats() {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => !data.error && setStats(data))
      .catch(() => {});
  }

  useEffect(() => {
    loadTickets();
    loadStats();
    const socket = getSocket();
    socket.emit("join-agents");
    function refresh() {
      loadTickets();
      loadStats();
    }
    socket.on("ticket:new", refresh);
    socket.on("ticket:updated", refresh);
    return () => {
      socket.off("ticket:new", refresh);
      socket.off("ticket:updated", refresh);
    };
  }, []);

  const filtered = (tickets || []).filter((t) => {
    if (filter === "All") return true;
    if (filter === "Unassigned") return !t.assignedAgent;
    if (filter === "Mine") return t.assignedAgent?._id === user.id;
    return t.status === filter;
  });

  return (
    <div className="min-h-screen">
      <Navbar user={user} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink-900">Agent dashboard</h1>
        <p className="mb-6 text-sm text-slate-500">Review AI triage, respond to customers, and resolve tickets.</p>

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total tickets" value={stats.total} />
            <StatCard label="New" value={stats.byStatus?.New || 0} accent="text-slate-600" />
            <StatCard label="In progress" value={stats.byStatus?.["In Progress"] || 0} accent="text-amber-600" />
            <StatCard label="Resolved" value={stats.byStatus?.Resolved || 0} accent="text-emerald-600" />
          </div>
        )}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="High priority" value={stats.byPriority?.High || 0} accent="text-coral-600" />
            <StatCard label="Medium priority" value={stats.byPriority?.Medium || 0} accent="text-amber-600" />
            <StatCard label="Low priority" value={stats.byPriority?.Low || 0} />
            <StatCard label="Avg. resolution time" value={`${stats.avgResolutionHours || 0}h`} accent="text-teal-600" />
          </div>
        )}

        {error && <Banner type="error">{error}</Banner>}

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                filter === f
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {!tickets && !error && <LoadingSpinner label="Loading tickets…" />}

        {tickets && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
            No tickets in this view.
          </div>
        )}

        {tickets && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <TicketCard
                key={t._id}
                ticket={t}
                href={`/agent/tickets/${t._id}`}
                footer={
                  <span className="text-xs text-slate-400">
                    {t.assignedAgent ? t.assignedAgent.name : "Unassigned"}
                  </span>
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AgentDashboardPage() {
  return <RequireAuth allowRoles={["agent", "admin"]}>{(user) => <Dashboard user={user} />}</RequireAuth>;
}
