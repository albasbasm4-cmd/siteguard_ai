import { useState } from 'react';
import { X, MapPin, DollarSign, Wrench, ScrollText, AlertTriangle, Camera, StickyNote, Trash2 } from 'lucide-react';
import type { Hazard } from '@/types';
import { HAZARD_TYPE_META, SEVERITY_META, REGULATIONS, formatFine } from '@/types';
import {
  Flame, FlaskConical, Zap, ArrowDownFromLine, HardHat, Building2,
} from 'lucide-react';

const ICON_MAP: Record<string, typeof Flame> = {
  fire: Flame,
  chemical: FlaskConical,
  electrical: Zap,
  fall: ArrowDownFromLine,
  ppe: HardHat,
  structural: Building2,
};

interface HazardPinModalProps {
  hazard: Hazard | null;
  onClose: () => void;
  onDelete: (hazardId: string) => void;
}

export function HazardPinModal({ hazard, onClose, onDelete }: HazardPinModalProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!hazard) return null;

  const meta = HAZARD_TYPE_META[hazard.type];
  const Icon = ICON_MAP[hazard.type] ?? Flame;
  const sevMeta = SEVERITY_META[hazard.severity];
  const reg = hazard.regulation ? REGULATIONS[hazard.regulation] : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ animation: 'modalFadeIn 0.2s ease-out' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-700/60 bg-slate-900/90 shadow-2xl shadow-black/60 backdrop-blur-xl"
        style={{ animation: 'modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Top accent */}
        <div className="h-1 w-full" style={{ backgroundColor: sevMeta.pinColor }} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${meta.borderColor} ${meta.bgColor}`}>
              <Icon className={`h-4 w-4 ${meta.color}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{meta.label}</h3>
              <p className="text-[11px] text-zinc-500">Hazard Pin Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Photo preview */}
        {hazard.photo_url && (
          <div className="relative h-44 overflow-hidden border-b border-zinc-800">
            <img
              src={hazard.photo_url}
              alt={meta.label}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
              <Camera className="h-3 w-3 text-zinc-400" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">AI Vision Capture</span>
            </div>
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 backdrop-blur-sm">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: sevMeta.pinColor }}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">{sevMeta.label}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="max-h-[40vh] overflow-y-auto p-4">
          {/* Title and severity */}
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-white">{meta.label}</h4>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${sevMeta.bgColor} ${sevMeta.color}`}
            >
              {sevMeta.label} Severity
            </span>
          </div>

          {/* Location */}
          <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
            <MapPin className="h-3.5 w-3.5 text-amber-400/70" />
            {hazard.location_label}
          </div>

          {/* Description */}
          {hazard.description && (
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">{hazard.description}</p>
          )}

          {/* OSHA Regulation */}
          {hazard.regulation && (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">{hazard.regulation}</span>
              </div>
              {reg && (
                <>
                  <p className="mt-1 text-xs font-medium text-zinc-300">{reg.title}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{reg.description}</p>
                </>
              )}
            </div>
          )}

          {/* Estimated Fine */}
          {hazard.estimated_fine != null && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-zinc-400">Estimated Fine</span>
              </div>
              <span className="text-lg font-bold text-red-400">{formatFine(hazard.estimated_fine)}</span>
            </div>
          )}

          {/* Corrective Action */}
          {hazard.corrective_action && (
            <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">Corrective Action</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">{hazard.corrective_action}</p>
            </div>
          )}

          {/* Inspector Notes */}
          {hazard.notes && (
            <div className="mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold text-blue-400">Inspector Notes</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{hazard.notes}</p>
            </div>
          )}

          {/* Status */}
          <div className="mt-3 flex items-center gap-2 border-t border-zinc-800 pt-3">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Status: <span className="text-white">{hazard.status}</span>
            </span>
            <span className="ml-auto text-[10px] text-zinc-600">
              Detected {new Date(hazard.detected_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Delete pin */}
          <div className="mt-3">
            {confirmingDelete ? (
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2">
                <span className="text-[11px] text-red-300">Delete this hazard and its related data?</span>
                <button
                  onClick={() => onDelete(hazard.id)}
                  className="rounded-md bg-red-500/20 px-2 py-1 text-[11px] font-bold text-red-300 transition-colors hover:bg-red-500/30"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="text-[11px] text-zinc-400 transition-colors hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-[11px] font-medium text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Hazard Pin
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
