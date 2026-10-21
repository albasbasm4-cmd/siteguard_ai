import { useMemo, useState } from 'react';
import { Scale, Search, DollarSign, X } from 'lucide-react';
import { RULES_LIST, FINE_FOOTNOTE, type RuleEntry } from '@/data/rulesTable';

const SEVERITY_STYLES: Record<RuleEntry['severity'], { badge: string; card: string; label: string }> = {
  high: {
    badge: 'bg-red-500/20 text-red-300',
    card: 'border-red-500/20 bg-red-500/5',
    label: 'High',
  },
  medium: {
    badge: 'bg-yellow-500/20 text-yellow-300',
    card: 'border-yellow-500/20 bg-yellow-500/5',
    label: 'Medium',
  },
  low: {
    badge: 'bg-blue-500/20 text-blue-300',
    card: 'border-blue-500/20 bg-blue-500/5',
    label: 'Low',
  },
};

const SEVERITY_FILTERS: { id: 'all' | RuleEntry['severity']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

function formatFine(usd: number): string {
  return `$${usd.toLocaleString('en-US')}`;
}

export function RulesAndFines() {
  const [filter, setFilter] = useState<'all' | RuleEntry['severity']>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RULES_LIST.filter((rule) => {
      if (filter !== 'all' && rule.severity !== filter) return false;
      if (!q) return true;
      return (
        rule.title.toLowerCase().includes(q) ||
        rule.regulation_code.toLowerCase().includes(q) ||
        rule.corrective_action.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  const totalExposure = useMemo(
    () => filtered.reduce((sum, r) => sum + r.estimated_fine_usd, 0),
    [filtered]
  );

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Header + total exposure */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Regulations &amp; Fines</h2>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-400">
            {filtered.length} / {RULES_LIST.length}
          </span>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
          <DollarSign className="h-3.5 w-3.5" />
          Total exposure <span className="font-bold">{formatFine(totalExposure)}</span>
        </span>
      </div>

      {/* Filters + search */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          {SEVERITY_FILTERS.map((f) => (
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
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search violation, code, or action..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 py-1.5 pl-8 pr-7 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-500/50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Rules grid */}
      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <Scale className="h-12 w-12 text-zinc-700" />
          <p className="mt-3 text-sm font-medium text-zinc-400">No regulations match your search</p>
          <p className="mt-1 text-xs text-zinc-600">Try a different term or severity filter</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filtered.map((rule) => {
            const sev = SEVERITY_STYLES[rule.severity];
            return (
              <div
                key={rule.id}
                className={`rounded-xl border p-3 ${sev.card}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white">{rule.title}</h4>
                    <span
                      className={`mt-1 inline-block rounded border border-zinc-700/60 bg-zinc-900/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400`}
                    >
                      {rule.regulation_code}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${sev.badge}`}>
                      {sev.label}
                    </span>
                    <span className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-red-400">
                      {formatFine(rule.estimated_fine_usd)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 border-t border-zinc-800/60 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Corrective Action</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{rule.corrective_action}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[10px] italic leading-relaxed text-zinc-600">{FINE_FOOTNOTE}</p>
    </div>
  );
}
