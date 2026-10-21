import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertOctagon, ShieldCheck, Activity, Gauge, Wrench, PlayCircle, CheckCircle2, DollarSign } from 'lucide-react';
import type { Hazard, WorkOrder } from '@/types';
import { HAZARD_TYPE_META, SEVERITY_META, formatFine } from '@/types';

interface AnalyticsDashboardProps {
  hazards: Hazard[];
  complianceScore: number;
  tickets: WorkOrder[];
}

export function AnalyticsDashboard({ hazards, complianceScore, tickets }: AnalyticsDashboardProps) {
  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    const bySeverity = new Map<string, number>();
    const byStatus = new Map<string, number>();

    hazards.forEach((h) => {
      byType.set(h.type, (byType.get(h.type) ?? 0) + 1);
      bySeverity.set(h.severity, (bySeverity.get(h.severity) ?? 0) + 1);
      byStatus.set(h.status, (byStatus.get(h.status) ?? 0) + 1);
    });

    const ticketByStatus = new Map<string, number>();
    tickets.forEach((t) => {
      ticketByStatus.set(t.status, (ticketByStatus.get(t.status) ?? 0) + 1);
    });

    const totalExposure = hazards.reduce((sum, h) => sum + (h.estimated_fine ?? 0), 0);

    const open = byStatus.get('open') ?? 0;
    const acknowledged = byStatus.get('acknowledged') ?? 0;
    const resolved = byStatus.get('resolved') ?? 0;

    return {
      total: hazards.length,
      byType,
      bySeverity,
      open,
      acknowledged,
      resolved,
      critical: bySeverity.get('critical') ?? 0,
      ticketsOpen: ticketByStatus.get('open') ?? 0,
      ticketsInProgress: ticketByStatus.get('in_progress') ?? 0,
      ticketsResolved: ticketByStatus.get('resolved') ?? 0,
      totalExposure,
    };
  }, [hazards, tickets]);

  const maxTypeCount = Math.max(...Array.from(stats.byType.values()), 1);
  const severityOrder = ['critical', 'high', 'medium', 'low'] as const;
  const typeEntries = Object.entries(HAZARD_TYPE_META);

  const scoreColor = complianceScore >= 80 ? 'text-emerald-400' : complianceScore >= 60 ? 'text-amber-400' : 'text-red-400';
  const scoreBg = complianceScore >= 80 ? 'from-emerald-500 to-emerald-600' : complianceScore >= 60 ? 'from-amber-500 to-amber-600' : 'from-red-500 to-red-600';

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Gauge className="h-5 w-5" />}
          label="Compliance Score"
          value={`${complianceScore}`}
          suffix="/ 100"
          color={scoreColor}
          bgGradient={scoreBg}
        />
        <StatCard
          icon={<AlertOctagon className="h-5 w-5" />}
          label="Total Hazards"
          value={`${stats.total}`}
          color="text-orange-400"
          bgGradient="from-orange-500 to-orange-600"
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Resolved"
          value={`${stats.resolved}`}
          color="text-emerald-400"
          bgGradient="from-emerald-500 to-emerald-600"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Open / Critical"
          value={`${stats.open} / ${stats.critical}`}
          color="text-red-400"
          bgGradient="from-red-500 to-red-600"
        />
      </div>

      {/* Ticket status + total exposure */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Wrench className="h-5 w-5" />}
          label="Tickets Open"
          value={`${stats.ticketsOpen}`}
          color="text-red-400"
          bgGradient="from-red-500 to-red-600"
        />
        <StatCard
          icon={<PlayCircle className="h-5 w-5" />}
          label="Tickets In Progress"
          value={`${stats.ticketsInProgress}`}
          color="text-amber-400"
          bgGradient="from-amber-500 to-amber-600"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Tickets Resolved"
          value={`${stats.ticketsResolved}`}
          color="text-emerald-400"
          bgGradient="from-emerald-500 to-emerald-600"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Est. Fine Exposure"
          value={formatFine(stats.totalExposure)}
          color="text-red-400"
          bgGradient="from-red-500 to-red-600"
        />
      </div>

      {/* Compliance Score Gauge */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Compliance Score Breakdown</h3>
        <div className="flex items-center gap-6">
          {/* Circular Gauge */}
          <div className="relative h-28 w-28 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(39,39,42)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round"
                stroke={complianceScore >= 80 ? '#10b981' : complianceScore >= 60 ? '#f59e0b' : '#ef4444'}
                strokeDasharray={`${(complianceScore / 100) * 264} 264`}
                style={{ transition: 'stroke-dasharray 0.8s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{complianceScore}</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Score</span>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="flex-1 space-y-2">
            <StatusRow label="Open" count={stats.open} total={stats.total} color="bg-red-500" />
            <StatusRow label="Acknowledged" count={stats.acknowledged} total={stats.total} color="bg-amber-500" />
            <StatusRow label="Resolved" count={stats.resolved} total={stats.total} color="bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* Hazard Types Bar Chart */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Hazards by Type</h3>
        <div className="space-y-2.5">
          {typeEntries.map(([key, meta]) => {
            const count = stats.byType.get(key) ?? 0;
            const pct = (count / maxTypeCount) * 100;
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-zinc-400">{meta.label}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-zinc-800/60">
                  <div
                    className={`h-full rounded ${meta.bgColor} border-r-2 ${meta.borderColor} transition-all duration-700`}
                    style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs font-bold text-zinc-300">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Severity Distribution</h3>
        <div className="grid grid-cols-4 gap-2">
          {severityOrder.map((sev) => {
            const count = stats.bySeverity.get(sev) ?? 0;
            const meta = SEVERITY_META[sev];
            return (
              <div key={sev} className={`rounded-lg ${meta.bgColor} p-3 text-center ring-1 ${meta.ring}`}>
                <p className={`text-2xl font-bold ${meta.color}`}>{count}</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">{meta.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trend placeholder */}
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Safety Trend (Last 7 Inspections)</h3>
          <span className={`flex items-center gap-1 text-xs ${complianceScore >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>
            {complianceScore >= 60 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {complianceScore >= 60 ? 'Improving' : 'Needs Attention'}
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-2" style={{ height: '80px' }}>
          {[72, 68, 75, 70, 82, 78, complianceScore].map((val, idx) => (
            <div key={idx} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-t transition-all duration-700 ${
                  val >= 80 ? 'bg-emerald-500/60' : val >= 60 ? 'bg-amber-500/60' : 'bg-red-500/60'
                }`}
                style={{ height: `${Math.max(val, 5)}%` }}
              />
              <span className="text-[9px] text-zinc-600">{idx === 6 ? 'Now' : `-${7 - idx}d`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, suffix, color, bgGradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  color: string;
  bgGradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br ${bgGradient} opacity-10`} />
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
      <p className="mt-2 text-xl font-bold text-white">
        {value}
        {suffix && <span className="ml-1 text-xs font-normal text-zinc-500">{suffix}</span>}
      </p>
    </div>
  );
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-zinc-400">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right text-xs font-bold text-zinc-300">{count}</span>
    </div>
  );
}
