import { useMemo } from 'react';
import { ScrollText, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import type { Hazard } from '@/types';
import { REGULATIONS } from '@/types';

interface RegulationMatcherProps {
  hazards: Hazard[];
}

export function RegulationMatcher({ hazards }: RegulationMatcherProps) {
  const matched = useMemo(() => {
    const map = new Map<string, { count: number; hazards: Hazard[] }>();
    hazards.forEach((h) => {
      if (h.regulation) {
        const existing = map.get(h.regulation);
        if (existing) {
          existing.count++;
          existing.hazards.push(h);
        } else {
          map.set(h.regulation, { count: 1, hazards: [h] });
        }
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [hazards]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Regulation Matcher</h3>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
          {matched.length}
        </span>
      </div>

      {matched.length === 0 ? (
        <div className="flex flex-col items-center py-4 text-center">
          <ScrollText className="h-7 w-7 text-zinc-700" />
          <p className="mt-1.5 text-xs text-zinc-500">Regulations will appear as hazards are detected</p>
        </div>
      ) : (
        <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1">
          {matched.map(([code, { count, hazards: matchedHazards }]) => {
            const reg = REGULATIONS[code];
            const hasCritical = matchedHazards.some((h) => h.severity === 'critical');
            const allResolved = matchedHazards.every((h) => h.status === 'resolved');

            return (
              <div
                key={code}
                className={`rounded-lg border p-2.5 transition-colors ${
                  allResolved
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : hasCritical
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-zinc-800 bg-zinc-900/60'
                }`}
                style={{ animation: 'logSlide 0.3s ease-out' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-amber-400">{code}</span>
                      {allResolved ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      ) : hasCritical ? (
                        <AlertCircle className="h-3 w-3 text-red-400" />
                      ) : null}
                    </div>
                    {reg && (
                      <p className="mt-0.5 text-[11px] font-medium text-zinc-300">{reg.title}</p>
                    )}
                    {reg && (
                      <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">{reg.description}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    allResolved ? 'bg-emerald-500/20 text-emerald-300' :
                    hasCritical ? 'bg-red-500/20 text-red-300' :
                    'bg-amber-500/20 text-amber-300'
                  }`}>
                    {count}
                  </span>
                </div>

                {/* Mini hazard list */}
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {matchedHazards.slice(0, 4).map((h) => (
                    <span
                      key={h.id}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                        h.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400/70 line-through' :
                        h.status === 'acknowledged' ? 'bg-amber-500/10 text-amber-400/70' :
                        'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {h.location_label.split('·')[0].trim()}
                    </span>
                  ))}
                  {matchedHazards.length > 4 && (
                    <span className="rounded px-1.5 py-0.5 text-[9px] text-zinc-600">
                      +{matchedHazards.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes logSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
