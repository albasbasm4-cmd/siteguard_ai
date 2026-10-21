import { useMemo } from 'react';
import {
  Flame, FlaskConical, Zap, ArrowDownFromLine, HardHat, Building2,
  ChevronRight, CheckCircle2, AlertTriangle, Clock, XCircle, DollarSign, BadgeCheck,
  Bot, User,
} from 'lucide-react';
import type { Hazard, HazardSource } from '@/types';
import { HAZARD_TYPE_META, SEVERITY_META, formatFine } from '@/types';
import { FINE_FOOTNOTE } from '@/data/rulesTable';

interface HazardsFeedProps {
  hazards: Hazard[];
  onUpdateStatus: (id: string, status: Hazard['status']) => void;
}

const ICON_MAP: Record<string, typeof Flame> = {
  fire: Flame,
  chemical: FlaskConical,
  electrical: Zap,
  fall: ArrowDownFromLine,
  ppe: HardHat,
  structural: Building2,
};

const STATUS_META: Record<Hazard['status'], { label: string; icon: typeof Clock; color: string }> = {
  open: { label: 'Open', icon: AlertTriangle, color: 'text-red-400' },
  acknowledged: { label: 'Acknowledged', icon: Clock, color: 'text-amber-400' },
  resolved: { label: 'Resolved', icon: CheckCircle2, color: 'text-emerald-400' },
};

export function HazardsFeed({ hazards, onUpdateStatus }: HazardsFeedProps) {
  const sorted = useMemo(() => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...hazards].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [hazards]);

  const totalFines = useMemo(() =>
    hazards.reduce((sum, h) => sum + (h.estimated_fine ?? 0), 0),
  [hazards]);

  const nextStatus: Record<Hazard['status'], Hazard['status'] | null> = {
    open: 'acknowledged',
    acknowledged: 'resolved',
    resolved: null,
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Detected Hazards Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          {totalFines > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300" title="Estimated total">
              <DollarSign className="h-2.5 w-2.5" />
              Est. {formatFine(totalFines)}
            </span>
          )}
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
            {hazards.length}
          </span>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-zinc-700" />
          <p className="mt-2 text-xs text-zinc-500">No hazards detected yet</p>
          <p className="text-[10px] text-zinc-600">Upload a photo or place pins manually</p>
        </div>
      ) : (
        <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
          {sorted.map((hazard, idx) => {
            const meta = HAZARD_TYPE_META[hazard.type];
            const Icon = ICON_MAP[hazard.type] ?? Flame;
            const sevMeta = SEVERITY_META[hazard.severity];
            const statusMeta = STATUS_META[hazard.status];
            const StatusIcon = statusMeta.icon;
            const next = nextStatus[hazard.status];

            return (
              <div
                key={hazard.id}
                className={`overflow-hidden rounded-lg border ${meta.borderColor} ${meta.bgColor}`}
                style={{ animation: `logSlide 0.3s ease-out ${idx * 0.03}s both` }}
              >
                {/* Photo thumbnail strip */}
                {hazard.photo_url && (
                  <div className="relative h-16 w-full overflow-hidden">
                    <img
                      src={hazard.photo_url}
                      alt={meta.label}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                    {/* Severity dot on photo */}
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-0.5 backdrop-blur-sm">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: sevMeta.pinColor }}
                      />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-white">{sevMeta.label}</span>
                    </div>
                    {/* Type label on photo */}
                    <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5">
                      <div className={`flex h-5 w-5 items-center justify-center rounded border ${meta.borderColor} bg-slate-900/80 backdrop-blur-sm`}>
                        <Icon className={`h-3 w-3 ${meta.color}`} />
                      </div>
                      <span className="text-[11px] font-bold text-white">{meta.label}</span>
                    </div>
                  </div>
                )}

                {/* Card body */}
                <div className="p-2.5">
                  {/* Header (if no photo, show icon+title here) */}
                  {!hazard.photo_url && (
                    <div className="flex items-start gap-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${meta.borderColor} bg-slate-900/60`}>
                        <Icon className={`h-4 w-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{meta.label}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${sevMeta.bgColor} ${sevMeta.color}`}>
                            {sevMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <p className={`truncate text-[11px] text-zinc-400 ${hazard.photo_url ? 'mt-1' : 'mt-1.5'}`}>
                    {hazard.location_label}
                  </p>

                  {/* Description */}
                  {hazard.description && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{hazard.description}</p>
                  )}

                  {/* Compliance badge + fine */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {hazard.regulation && (
                      <span className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                        <BadgeCheck className="h-2.5 w-2.5" />
                        {hazard.regulation}
                      </span>
                    )}
                    {hazard.estimated_fine != null && (
                      <span className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-400" title="Estimated fine">
                        <DollarSign className="h-2.5 w-2.5" />
                        Est. {formatFine(hazard.estimated_fine)}
                      </span>
                    )}
                    {hazard.source && (
                      <SourceBadge source={hazard.source} />
                    )}
                  </div>

                  {/* Inspector notes */}
                  {hazard.notes && (
                    <div className="mt-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-blue-400">Inspector Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-400">{hazard.notes}</p>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="mt-2 flex items-center justify-between border-t border-zinc-800/50 pt-1.5">
                    <div className="flex items-center gap-1">
                      <StatusIcon className={`h-3 w-3 ${statusMeta.color}`} />
                      <span className={`text-[10px] font-medium uppercase tracking-wider ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    {next && (
                      <button
                        onClick={() => onUpdateStatus(hazard.id, next)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                      >
                        Mark as {STATUS_META[next].label.toLowerCase()}
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                    {hazard.status === 'resolved' && (
                      <button
                        onClick={() => onUpdateStatus(hazard.id, 'open')}
                        className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-zinc-500 hover:text-red-400"
                      >
                        <XCircle className="h-3 w-3" /> Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fine footnote */}
      {hazards.length > 0 && (
        <p className="mt-2 px-1 text-[9px] italic leading-relaxed text-zinc-600">{FINE_FOOTNOTE}</p>
      )}

      <style>{`
        @keyframes logSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

const SOURCE_BADGE_META: Partial<Record<HazardSource, { label: string; icon: typeof Bot; classes: string }>> = {
  ai: { label: 'AI', icon: Bot, classes: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' },
  inspector: { label: 'Inspector', icon: User, classes: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
};

function SourceBadge({ source }: { source: HazardSource }) {
  const meta = SOURCE_BADGE_META[source];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <span className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold ${meta.classes}`}>
      <Icon className="h-2.5 w-2.5" />
      {meta.label}
    </span>
  );
}
