import { useState, useEffect, useMemo } from 'react';
import {
  Wrench, Clock, AlertTriangle, CheckCircle2, Timer,
  ChevronDown, PlayCircle, ListFilter, User, Trash2, X,
} from 'lucide-react';
import type { Hazard, WorkOrder, WorkOrderStatus } from '@/types';
import { TECHNICIANS, TECHNICIAN_INITIALS } from '@/types';

interface MaintenanceDispatchProps {
  tickets: WorkOrder[];
  hazards: Hazard[];
  onUpdateTicketStatus: (ticketId: string, status: WorkOrderStatus) => void;
  onAssignTechnician: (ticketId: string, technician: string) => void;
  onResolveHazard: (hazardId: string, resolved: boolean) => void;
  onClearAllTickets: () => void;
}

const SLA_MS = 24 * 60 * 60 * 1000;
const AMBER_THRESHOLD_MS = 4 * 60 * 60 * 1000;

const STATUS_META: Record<WorkOrderStatus, { label: string; color: string; bg: string; border: string }> = {
  open: { label: 'Open', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  in_progress: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  resolved: { label: 'Resolved', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
};

const NEXT_STATUS: Record<WorkOrderStatus, WorkOrderStatus | null> = {
  open: 'in_progress',
  in_progress: 'resolved',
  resolved: 'open',
};

const FILTERS: { id: 'all' | WorkOrderStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

export function MaintenanceDispatch({
  tickets,
  hazards,
  onUpdateTicketStatus,
  onAssignTechnician,
  onResolveHazard,
  onClearAllTickets,
}: MaintenanceDispatchProps) {
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<'all' | WorkOrderStatus>('all');
  const [confirmingClear, setConfirmingClear] = useState(false);

  // SLA clock — ticks every second, cleaned up on unmount
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hazardById = useMemo(() => {
    const map = new Map<string, Hazard>();
    hazards.forEach((h) => map.set(h.id, h));
    return map;
  }, [hazards]);

  const counts = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === 'open').length,
      in_progress: tickets.filter((t) => t.status === 'in_progress').length,
      resolved: tickets.filter((t) => t.status === 'resolved').length,
    }),
    [tickets]
  );

  const visibleTickets = useMemo(
    () =>
      [...tickets]
        .filter((t) => filter === 'all' || t.status === filter)
        .sort((a, b) => a.ticketId.localeCompare(b.ticketId)),
    [tickets, filter]
  );

  const handleStatusChange = (ticket: WorkOrder, status: WorkOrderStatus) => {
    const wasResolved = ticket.status === 'resolved';
    onUpdateTicketStatus(ticket.id, status);
    if (status === 'resolved' && !wasResolved) {
      onResolveHazard(ticket.hazardId, true);
    } else if (wasResolved && status !== 'resolved') {
      onResolveHazard(ticket.hazardId, false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Header + clear all */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Maintenance Dispatch</h2>
        </div>
        {tickets.length > 0 && (
          confirmingClear ? (
            <span className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">
              Delete all?
              <button
                onClick={() => { setConfirmingClear(false); onClearAllTickets(); }}
                className="font-bold text-red-400 hover:text-red-300"
              >
                Yes
              </button>
              <button onClick={() => setConfirmingClear(false)} className="text-zinc-400 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmingClear(true)}
              title="Delete all work orders"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )
        )}
      </div>

      {/* Summary counters */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <span className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400">
          <span>Open</span>
          <span className="font-bold">{counts.open}</span>
        </span>
        <span className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
          <span>In Progress</span>
          <span className="font-bold">{counts.in_progress}</span>
        </span>
        <span className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
          <span>Resolved</span>
          <span className="font-bold">{counts.resolved}</span>
        </span>
      </div>

      {/* Status filter */}
      <div className="mt-3 flex items-center gap-1.5">
        <ListFilter className="h-3.5 w-3.5 text-zinc-500" />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              filter === f.id
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {visibleTickets.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <Wrench className="h-12 w-12 text-zinc-700" />
          <p className="mt-3 text-sm font-medium text-zinc-400">
            {tickets.length === 0 ? 'No work orders yet' : 'No tickets match this filter'}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {tickets.length === 0
              ? 'Work orders are created automatically for each detected hazard'
              : 'Try a different status filter'}
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {visibleTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              hazard={hazardById.get(ticket.hazardId) ?? null}
              now={now}
              onStatusChange={handleStatusChange}
              onAssign={onAssignTechnician}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket, hazard, now, onStatusChange, onAssign,
}: {
  ticket: WorkOrder;
  hazard: Hazard | null;
  now: number;
  onStatusChange: (ticket: WorkOrder, status: WorkOrderStatus) => void;
  onAssign: (ticketId: string, technician: string) => void;
}) {
  const statusMeta = STATUS_META[ticket.status];
  const isResolved = ticket.status === 'resolved';

  // SLA computation
  const createdAtMs = new Date(ticket.created_at).getTime();
  const deadlineMs = createdAtMs + SLA_MS;
  const resolvedMs = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : null;
  const remainingMs = deadlineMs - (isResolved && resolvedMs ? resolvedMs : now);

  let slaState: 'ok' | 'warning' | 'breached' | 'resolved_within' | 'resolved_after';
  if (isResolved) {
    slaState = remainingMs >= 0 ? 'resolved_within' : 'resolved_after';
  } else if (remainingMs <= 0) {
    slaState = 'breached';
  } else if (remainingMs < AMBER_THRESHOLD_MS) {
    slaState = 'warning';
  } else {
    slaState = 'ok';
  }

  const slaDisplay = (() => {
    switch (slaState) {
      case 'resolved_within':
        return { label: 'Resolved within SLA', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
      case 'resolved_after':
        return { label: 'Resolved after SLA', color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-600/30' };
      case 'breached':
        return { label: 'SLA BREACHED', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/40' };
      case 'ok': {
        const abs = Math.abs(remainingMs);
        const h = Math.floor(abs / 3600000);
        const m = Math.floor((abs % 3600000) / 60000);
        const s = Math.floor((abs % 60000) / 1000);
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return { label: `${time} left`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
      }
      case 'warning': {
        const abs = Math.abs(remainingMs);
        const h = Math.floor(abs / 3600000);
        const m = Math.floor((abs % 3600000) / 60000);
        const s = Math.floor((abs % 60000) / 1000);
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return {
          label: remainingMs >= 0 ? `${time} left` : `-${time}`,
          color: slaState === 'warning' ? 'text-amber-400' : 'text-emerald-400',
          bg: slaState === 'warning'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-emerald-500/10 border-emerald-500/30',
        };
      }
    }
  })();

  const next = NEXT_STATUS[ticket.status];

  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        slaState === 'breached'
          ? 'border-red-500/40 bg-red-500/5'
          : 'border-zinc-800 bg-zinc-900/40'
      }`}
    >
      {/* Top row: ticket id + severity + status */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-bold text-amber-400">{ticket.ticketId}</span>
        {hazard && (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
            style={{
              backgroundColor: `${SEVERITY_PIN[hazard.severity] ?? '#eab308'}20`,
              color: SEVERITY_PIN[hazard.severity] ?? '#eab308',
            }}
          >
            {hazard.severity}
          </span>
        )}
        <span className={`ml-auto rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusMeta.bg} ${statusMeta.border} ${statusMeta.color}`}>
          {statusMeta.label}
        </span>
      </div>

      {/* Title + location */}
      <h4 className="mt-1.5 truncate text-sm font-bold text-white">{ticket.title}</h4>
      {hazard?.description && (
        <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-500">{hazard.description}</p>
      )}

      {/* SLA + created time */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[11px] font-bold ${slaDisplay.bg} ${slaDisplay.color}`}>
          {isResolved ? <CheckCircle2 className="h-3 w-3" /> : slaState === 'breached' ? <AlertTriangle className="h-3 w-3" /> : <Timer className="h-3 w-3" />}
          {slaDisplay.label}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Clock className="h-3 w-3" />
          Created {formatCreated(ticket.created_at)}
        </span>
      </div>

      {/* Bottom row: technician + status buttons */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-800/60 pt-2">
        <div className="relative">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-300">
            {TECHNICIAN_INITIALS[ticket.technician] ?? ticket.technician.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="relative flex-1">
          <User className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
          <select
            value={ticket.technician}
            onChange={(e) => onAssign(ticket.id, e.target.value)}
            className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 pl-7 pr-7 text-[11px] text-zinc-200 outline-none focus:border-amber-500/50"
          >
            {TECHNICIANS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
        </div>
        {next && (
          <button
            onClick={() => onStatusChange(ticket, next)}
            className={`flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
              next === 'resolved'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            }`}
          >
            {next === 'in_progress' ? <PlayCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
            {next === 'in_progress' ? 'Start' : 'Resolve'}
          </button>
        )}
        {isResolved && (
          <button
            onClick={() => onStatusChange(ticket, 'open')}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}

const SEVERITY_PIN: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

function formatCreated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
