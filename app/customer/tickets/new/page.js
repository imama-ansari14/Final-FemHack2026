"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "../../../../components/RequireAuth";
import Navbar from "../../../../components/Navbar";
import Banner from "../../../../components/Banner";
import Avatar from "../../../../components/Avatar";
import Swal from "sweetalert2";

const CATEGORIES = ["", "Water Supply", "Sewage", "Electricity", "Road/Street", "Sanitation", "Other"];

function NewTicketForm({ user }) {
  const router = useRouter();

  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "",
    assignedAgent: "",
  });

  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Load available workers once, on mount. Nothing else belongs in here.
  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch("/api/agents");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not load workers.");
        setAgents(data.agents || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingAgents(false);
      }
    }
    loadAgents();
  }, []);

  // Live AI category suggestion as the customer types (debounced).
  useEffect(() => {
    if (!form.subject.trim() && !form.description.trim()) {
      setAiSuggestion(null);
      return;
    }
    setAiLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/tickets/suggest-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: form.subject, description: form.description }),
        });
        const data = await res.json();
        if (data.category) setAiSuggestion(data);
      } catch {
        // silent — this is just a live hint
      } finally {
        setAiLoading(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [form.subject, form.description]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.assignedAgent) {
      setError("Please select a worker for your complaint.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create ticket.");

      const workerName =
        agents.find((a) => (a._id || a.id) === form.assignedAgent)?.name || "the worker";

      await Swal.fire({
        icon: "success",
        title: "Complaint submitted!",
        text: `Your ticket ${data.ticket.ticketNumber} has been created and sent to ${workerName}.`,
        confirmButtonColor: "#0C7F6E",
        timer: 3000,
        timerProgressBar: true,
      });

      const ticketId = data.ticket?._id || data.ticket?.id;
      router.push(ticketId ? `/customer/tickets/${ticketId}` : `/customer/tickets`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar user={user} />

      <main className="mx-auto max-w-2xl px-5 py-8">
        <div className="mb-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-teal-600">
            Support request
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Submit a complaint</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tell us what happened and choose the worker who should handle your complaint.
          </p>
        </div>

        {error && (
          <div className="mb-4">
            <Banner type="error">{error}</Banner>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          {/* Subject */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Complaint subject</label>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. Water pipe is damaged"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Complaint details</label>
            <textarea
              required
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your complaint in detail..."
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Complaint category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category || "Let AI suggest category"}
                </option>
              ))}
            </select>

            {aiLoading && <p className="mt-1 text-xs text-slate-400">AI is analyzing your complaint…</p>}
            {aiSuggestion && !aiLoading && (
              <button
                type="button"
                onClick={() => setForm({ ...form, category: aiSuggestion.category })}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-100"
              >
                ✨ AI suggests: <strong>{aiSuggestion.category}</strong> ({aiSuggestion.priority} priority) — tap to apply
              </button>
            )}
          </div>

          {/* Worker */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Select a worker</label>

            {loadingAgents ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
                Loading available workers...
              </div>
            ) : agents.length === 0 ? (
              <div className="rounded-lg border border-coral-200 bg-coral-50 px-3 py-3 text-sm text-coral-700">
                No workers are currently available.
              </div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => {
                  const agentId = agent._id || agent.id;
                  const selected = form.assignedAgent === agentId;
                  return (
                    <button
                      type="button"
                      key={agentId}
                      onClick={(e) => {
                        e.preventDefault();
                        setForm((prev) => ({ ...prev, assignedAgent: agentId }));
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected
                        ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
                        : "border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50"
                        }`}
                    >
                      <Avatar user={agent} size={42} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-900">{agent.name}</p>
                        <p className="text-xs text-slate-500">Support Worker</p>
                      </div>
                      <span className={`h-3 w-3 rounded-full ${selected ? "bg-teal-500" : "bg-slate-300"}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-4">
            <p className="text-xs font-medium text-teal-800">✨ AI-assisted triage</p>
            <p className="mt-1 text-xs leading-relaxed text-teal-700">
              Gemini analyzes your complaint as you type and suggests a category, priority and a short
              summary. The assigned worker will review the suggestion before handling the ticket.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || loadingAgents || agents.length === 0}
            className="w-full rounded-lg bg-ink-900 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating ticket & analyzing..." : "Submit complaint"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <RequireAuth allowRoles={["customer"]}>
      {(user) => <NewTicketForm user={user} />}
    </RequireAuth>
  );
}