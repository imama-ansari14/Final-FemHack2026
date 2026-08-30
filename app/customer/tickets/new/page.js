"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "../../../../components/RequireAuth";
import Navbar from "../../../../components/Navbar";
import Banner from "../../../../components/Banner";

const CATEGORIES = ["", "Billing", "Technical", "Account", "Shipping", "General"];

function NewTicketForm({ user }) {
  const router = useRouter();
  const [form, setForm] = useState({ subject: "", description: "", category: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
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
      router.push(`/customer/tickets/${data.ticket._id}`);
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
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink-900">Submit a new ticket</h1>
        <p className="mb-6 text-sm text-slate-500">
          Our AI will suggest a category, priority, and summary — an agent reviews it before it&apos;s finalized.
        </p>

        {error && (
          <div className="mb-4">
            <Banner type="error">{error}</Banner>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Subject</label>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="e.g. Charged twice for my last order"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
            <textarea
              required
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your issue in as much detail as possible…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Category <span className="font-normal text-slate-400">(optional — AI will suggest one otherwise)</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c || "Let AI decide"}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ink-900 py-2.5 text-sm font-medium text-white transition hover:bg-ink-800 disabled:opacity-50"
          >
            {loading ? "Submitting & analyzing with AI…" : "Submit ticket"}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewTicketPage() {
  return <RequireAuth allowRoles={["customer"]}>{(user) => <NewTicketForm user={user} />}</RequireAuth>;
}
