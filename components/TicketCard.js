"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";

export default function TicketCard({ ticket, href, footer }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-teal-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs text-slate-400">{ticket.ticketNumber}</span>
        <StatusBadge status={ticket.status} />
      </div>
      <h3 className="mb-1 truncate font-medium text-ink-900">{ticket.subject}</h3>
      <p className="mb-3 line-clamp-2 text-sm text-slate-500">{ticket.summary || ticket.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority} />
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {ticket.category}
          </span>
        </div>
        {footer}
      </div>
    </Link>
  );
}
