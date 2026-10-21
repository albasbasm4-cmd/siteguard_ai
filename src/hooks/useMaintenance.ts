import { useState, useEffect, useCallback, useRef } from 'react';
import type { Hazard, WorkOrder, WorkOrderStatus } from '@/types';
import { TECHNICIANS } from '@/types';

const TICKETS_KEY = 'siteguard_tickets';

function loadTickets(): WorkOrder[] {
  try {
    const raw = localStorage.getItem(TICKETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkOrder[]) : [];
  } catch {
    return [];
  }
}

function saveTickets(tickets: WorkOrder[]) {
  try {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch {
    // localStorage unavailable — tickets stay in memory for this session
  }
}

function formatTicketNumber(n: number): string {
  return `WO-${String(n).padStart(4, '0')}`;
}

function parseTicketNumber(ticketId: string): number {
  const match = ticketId.match(/^WO-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export function useMaintenance(hazards: Hazard[]) {
  const [tickets, setTickets] = useState<WorkOrder[]>(() => loadTickets());
  const ticketCounterRef = useRef<number>(
    loadTickets().reduce((max, t) => Math.max(max, parseTicketNumber(t.ticketId)), 0)
  );
  const technicianIndexRef = useRef<number>(0);
  const knownHazardIdsRef = useRef<Set<string>>(new Set(loadTickets().map((t) => t.hazardId)));

  // Persist whenever tickets change
  useEffect(() => {
    saveTickets(tickets);
  }, [tickets]);

  // Auto-create one work order per hazard (round-robin technician)
  useEffect(() => {
    const existing = loadTickets();
    const existingHazardIds = new Set(existing.map((t) => t.hazardId));
    const missing = hazards.filter((h) => !existingHazardIds.has(h.id));

    if (missing.length === 0) return;

    // Sync refs with what's on disk to keep counters stable across sessions
    const maxExisting = existing.reduce((max, t) => Math.max(max, parseTicketNumber(t.ticketId)), 0);
    if (maxExisting > ticketCounterRef.current) {
      ticketCounterRef.current = maxExisting;
    }
    technicianIndexRef.current = existing.length % TECHNICIANS.length;

    const newTickets: WorkOrder[] = missing.map((hazard, i) => {
      const num = ticketCounterRef.current + 1 + i;
      const createdIso = hazard.detected_at || new Date().toISOString();
      return {
        id: `${Date.now()}-${hazard.id}`,
        ticketId: formatTicketNumber(num),
        hazardId: hazard.id,
        title: hazard.location_label || hazard.type,
        severity: hazard.severity,
        status: 'open' as WorkOrderStatus,
        technician: TECHNICIANS[(technicianIndexRef.current + i) % TECHNICIANS.length],
        created_at: createdIso,
        resolved_at: null,
      };
    });
    ticketCounterRef.current += missing.length;
    technicianIndexRef.current = (technicianIndexRef.current + missing.length) % TECHNICIANS.length;

    knownHazardIdsRef.current = new Set([...knownHazardIdsRef.current, ...missing.map((h) => h.id)]);
    setTickets((prev) => {
      const prevIds = new Set(prev.map((t) => t.hazardId));
      const toAdd = newTickets.filter((t) => !prevIds.has(t.hazardId));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });
  }, [hazards]);

  // Drop work orders whose hazard no longer exists (e.g. hazards were cleared)
  useEffect(() => {
    setTickets((prev) => {
      const hazardIds = new Set(hazards.map((h) => h.id));
      const kept = prev.filter((t) => hazardIds.has(t.hazardId));
      return kept.length === prev.length ? prev : kept;
    });
  }, [hazards]);

  // Keep ticket severity/title synced if the hazard is edited
  useEffect(() => {
    setTickets((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        const hazard = hazards.find((h) => h.id === t.hazardId);
        if (!hazard) return t;
        const title = hazard.location_label || hazard.type;
        if (t.title !== title || t.severity !== hazard.severity) {
          changed = true;
          return { ...t, title, severity: hazard.severity };
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, [hazards]);

  const updateTicketStatus = useCallback((ticketDbId: string, status: WorkOrderStatus) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketDbId) return t;
        if (t.status === status) return t;
        return {
          ...t,
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        };
      })
    );
  }, []);

  const assignTechnician = useCallback((ticketDbId: string, technician: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketDbId ? { ...t, technician } : t))
    );
  }, []);

  const clearAllTickets = useCallback(() => {
    setTickets([]);
    ticketCounterRef.current = 0;
    technicianIndexRef.current = 0;
    knownHazardIdsRef.current = new Set();
  }, []);

  return { tickets, updateTicketStatus, assignTechnician, clearAllTickets };
}
