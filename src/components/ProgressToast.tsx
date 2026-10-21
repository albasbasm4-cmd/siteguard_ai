import { useEffect, useState } from 'react';
import { ScanLine, Eye, Database, CheckCircle2, Loader2 } from 'lucide-react';

export interface ProgressToastData {
  visible: boolean;
  step: number;
  steps: { label: string; icon: typeof ScanLine }[];
}

interface ProgressToastProps {
  data: ProgressToastData;
}

export function ProgressToast({ data }: ProgressToastProps) {
  const [internalStep, setInternalStep] = useState(0);

  useEffect(() => {
    if (data.visible) {
      setInternalStep(data.step);
    }
  }, [data.visible, data.step]);

  if (!data.visible) return null;

  const currentStepData = data.steps[internalStep];
  const StepIcon = currentStepData?.icon ?? Loader2;
  const pct = ((internalStep + 1) / data.steps.length) * 100;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[60] w-[90%] max-w-md -translate-x-1/2"
      style={{ animation: 'toastSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <div className="overflow-hidden rounded-xl border border-zinc-700/60 bg-slate-900 shadow-2xl shadow-black/60">
        {/* Top accent line */}
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500" />

        <div className="p-4">
          {/* Current step */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-500/30">
              <StepIcon className={`h-5 w-5 text-amber-400 ${internalStep < data.steps.length - 1 ? 'animate-pulse' : ''}`} />
              {internalStep < data.steps.length - 1 && (
                <span className="absolute inset-0 animate-ping rounded-lg bg-amber-500/10" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">
                {currentStepData?.label ?? 'Processing...'}
              </p>
              <p className="text-[11px] text-zinc-500">
                Step {internalStep + 1} of {data.steps.length}
              </p>
            </div>
            {internalStep >= data.steps.length - 1 && (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="mt-2.5 flex items-center justify-between">
            {data.steps.map((step, idx) => {
              const Icon = step.icon;
              const isDone = idx < internalStep;
              const isActive = idx === internalStep;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-1 transition-colors ${
                    isDone ? 'text-emerald-400' : isActive ? 'text-amber-400' : 'text-zinc-600'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {isDone && <CheckCircle2 className="h-3 w-3" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
