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
      if (updated._id === id) setTicket(updated);
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
                  <span>Waiting for an agent to pick this up</span>
                )}
              </div>
              {ticket.status === "Resolved" && ticket.resolutionNote && (
                <div className="mt-4">
                  <Banner type="success">
                    <strong>Resolved:</strong> {ticket.resolutionNote}
                  </Banner>
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
