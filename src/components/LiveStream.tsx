import { useEffect, useRef } from 'react';
import { Radio, Scan, Cpu, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { StreamLogEntry, InspectionPhase } from '@/hooks/useInspection';

interface LiveStreamProps {
  logs: StreamLogEntry[];
  phase: InspectionPhase;
  facilityName: string;
}

const PHASE_LABELS: Record<InspectionPhase, string> = {
  idle: 'Standby',
  scanning: 'Scanning Zones',
  detecting: 'Detecting Hazards',
  analyzing: 'Analyzing Regulations',
  complete: 'Inspection Complete',
};

export function LiveStream({ logs, phase, facilityName }: LiveStreamProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const phaseSteps: InspectionPhase[] = ['scanning', 'detecting', 'analyzing', 'complete'];
  const currentStepIndex = phaseSteps.indexOf(phase);

  const getLogIcon = (type: StreamLogEntry['type']) => {
    switch (type) {
      case 'detect':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
      case 'warn':
        return <Info className="h-3.5 w-3.5 text-sky-400" />;
      case 'success':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      default:
        return <Cpu className="h-3.5 w-3.5 text-zinc-500" />;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Phase Progress Bar */}
      <div className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${phase !== 'idle' ? 'animate-pulse text-amber-400' : 'text-zinc-600'}`} />
            <span className="text-sm font-semibold text-white">{PHASE_LABELS[phase]}</span>
          </div>
          <span className="text-[11px] text-zinc-500">{facilityName}</span>
        </div>

        {/* Phase indicators */}
        {phase !== 'idle' && (
          <div className="mt-3 flex items-center gap-1">
            {phaseSteps.map((step, idx) => (
              <div key={step} className="flex flex-1 items-center gap-1">
                <div
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    idx <= currentStepIndex
                      ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                      : 'bg-zinc-800'
                  }`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Vision Scanner Visual */}
      {phase !== 'idle' && phase !== 'complete' && (
        <div className="relative h-32 overflow-hidden border-b border-zinc-800 bg-slate-900/50">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-24 w-24">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-400" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-2 animate-spin rounded-full border-2 border-emerald-500/30 border-b-emerald-400" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Scan className="h-8 w-8 text-amber-400/80" />
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" style={{ animation: 'scanLine 2s linear infinite' }} />
          <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] font-medium uppercase tracking-wider text-red-400">REC</span>
          </div>
          <div className="absolute bottom-2 right-3">
            <span className="text-[10px] font-mono text-zinc-500">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>
        </div>
      )}

      {/* Stream Logs */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono">
        {logs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Cpu className="mx-auto h-10 w-10 text-zinc-700" />
              <p className="mt-2 text-sm text-zinc-500">AI inspection engine standing by</p>
              <p className="text-xs text-zinc-600">Click "Start Inspection" to begin</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-zinc-800/40"
                style={{ animation: 'logSlide 0.3s ease-out' }}
              >
                <span className="shrink-0 text-zinc-600">{log.timestamp}</span>
                <span className="shrink-0 pt-0.5">{getLogIcon(log.type)}</span>
                <span className={`${
                  log.type === 'detect' ? 'text-amber-300' :
                  log.type === 'warn' ? 'text-sky-300' :
                  log.type === 'success' ? 'text-emerald-300' :
                  'text-zinc-400'
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes logSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
