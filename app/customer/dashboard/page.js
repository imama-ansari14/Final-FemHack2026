"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "../../../components/RequireAuth";
import Navbar from "../../../components/Navbar";
import TicketCard from "../../../components/TicketCard";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Banner from "../../../components/Banner";

function Dashboard({ user }) {
  const [tickets, setTickets] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tickets")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setTickets(data.tickets);
      })
      .catch(() => setError("Could not load your tickets."));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar user={user} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Your tickets</h1>
            <p className="text-sm text-slate-500">Track and message our support team here.</p>
          </div>
          <Link
            href="/customer/tickets/new"
            className="rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-ink-800"
          >
            + New ticket
          </Link>
        </div>

        {error && <Banner type="error">{error}</Banner>}

        {!tickets && !error && <LoadingSpinner label="Loading your tickets…" />}

        {tickets && tickets.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <p className="mb-3 text-slate-500">You haven&apos;t submitted any tickets yet.</p>
            <Link href="/customer/tickets/new" className="font-medium text-teal-600 hover:underline">
              Create your first ticket →
            </Link>
          </div>
        )}

        {tickets && tickets.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((t) => (
              <TicketCard key={t._id} ticket={t} href={`/customer/tickets/${t._id}`} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CustomerDashboardPage() {
  return <RequireAuth allowRoles={["customer"]}>{(user) => <Dashboard user={user} />}</RequireAuth>;
}
