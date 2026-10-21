import { useState, useRef, useCallback } from 'react';
import {
  Map, Flame, Zap, HardHat, ArrowDownFromLine, Building2, FlaskConical,
  X, Plus, MousePointerClick, ChevronDown, Check,
} from 'lucide-react';
import type { Hazard } from '@/types';
import { HAZARD_TYPE_META, SEVERITY_META } from '@/types';
import { HazardPinModal } from '@/components/HazardPinModal';
import { RULES_LIST, RULES_TABLE } from '@/data/rulesTable';

interface FloorplanMapProps {
  hazards: Hazard[];
  facilityType: string;
  onPlaceHazard: (x: number, y: number) => void;
  onPlaceHazardByRule: (ruleId: string, x: number, y: number) => void;
  onPlacePendingHazard: (hazardId: string, x: number, y: number) => void;
  pendingHazardId: string | null;
  selectedHazardId: string | null;
  onSelectHazard: (id: string | null) => void;
  onDeleteHazard: (hazardId: string) => void;
}

const ICON_MAP: Record<string, typeof Flame> = {
  fire: Flame,
  chemical: FlaskConical,
  electrical: Zap,
  fall: ArrowDownFromLine,
  ppe: HardHat,
  structural: Building2,
};

const RULE_SEVERITY_PIN: Record<string, string> = {
  high: '#ef4444',
  medium: '#eab308',
  low: '#3b82f6',
};

export function FloorplanMap({
  hazards,
  onPlaceHazard,
  onPlaceHazardByRule,
  onPlacePendingHazard,
  pendingHazardId,
  selectedHazardId,
  onSelectHazard,
  onDeleteHazard,
}: FloorplanMapProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [modalHazard, setModalHazard] = useState<Hazard | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [smartMenu, setSmartMenu] = useState<{ x: number; y: number; px: number; py: number } | null>(null);
  const [smartSelected, setSmartSelected] = useState<string>('');
  const canvasRef = useRef<HTMLDivElement>(null);

  const zones = [
    { id: 'A', label: 'Zone A', x: 2, y: 2, w: 30, h: 42, type: 'Storage' },
    { id: 'B', label: 'Zone B', x: 34, y: 2, w: 32, h: 42, type: 'Loading' },
    { id: 'C', label: 'Zone C', x: 68, y: 2, w: 30, h: 50, type: 'Chemical' },
    { id: 'D', label: 'Zone D', x: 2, y: 46, w: 48, h: 52, type: 'Production' },
    { id: 'E', label: 'Zone E', x: 52, y: 54, w: 46, h: 44, type: 'Utility' },
  ];

  const hazardInZone = (zoneId: string, h: Hazard) => {
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return false;
    return h.zone_x >= zone.x && h.zone_x <= zone.x + zone.w && h.zone_y >= zone.y && h.zone_y <= zone.y + zone.h;
  };

  const hazardCountByZone = (zoneId: string) => hazards.filter((h) => hazardInZone(zoneId, h)).length;

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.round(Math.max(3, Math.min(97, x)));
    const clampedY = Math.round(Math.max(3, Math.min(97, y)));

    if (placementMode) {
      onPlaceHazard(clampedX, clampedY);
      setPlacementMode(false);
      setCursorPos(null);
      return;
    }

    // If there's a pending hazard to place (from "Add to Report"), place it directly
    if (pendingHazardId) {
      onPlacePendingHazard(pendingHazardId, clampedX, clampedY);
      return;
    }

    // Smart placement: clicking an empty area shows the floating glassmorphism menu
    // Check if we clicked on a pin (pins have their own onClick with stopPropagation)
    const target = e.target as HTMLElement;
    if (target.closest('button[data-hazard-pin]')) return;

    setSmartMenu({ x: clampedX, y: clampedY, px: e.clientX - rect.left, py: e.clientY - rect.top });
    setSmartSelected('');
  }, [placementMode, onPlaceHazard, pendingHazardId, onPlacePendingHazard]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placementMode || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setCursorPos({ x, y });
  }, [placementMode]);

  const handleSmartConfirm = useCallback(() => {
    if (!smartMenu || !smartSelected) return;
    onPlaceHazardByRule(smartSelected, smartMenu.x, smartMenu.y);
    setSmartMenu(null);
    setSmartSelected('');
  }, [smartMenu, smartSelected, onPlaceHazardByRule]);

  const selectedHazard = hazards.find((h) => h.id === selectedHazardId) ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Legend + Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Severity Legend</span>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500 ring-2 ring-red-500/30" />
            <span className="text-[11px] text-zinc-400">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-yellow-500 ring-2 ring-yellow-500/30" />
            <span className="text-[11px] text-zinc-400">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
            <span className="text-[11px] text-zinc-400">Low</span>
          </div>
        </div>

        <button
          onClick={() => setPlacementMode((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
            placementMode
              ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
              : 'border-zinc-700/60 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-600'
          }`}
        >
          {placementMode ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {placementMode ? 'Cancel Placement' : 'Place Hazard Pin'}
        </button>
      </div>

      {/* Placement mode hint */}
      {placementMode && (
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-1.5">
          <MousePointerClick className="h-3.5 w-3.5 animate-pulse text-amber-400" />
          <span className="text-[11px] font-medium text-amber-300">Click anywhere on the floorplan to manually place a hazard pin</span>
        </div>
      )}

      {/* Pending hazard hint */}
      {pendingHazardId && !placementMode && (
        <div className="flex items-center gap-2 border-b border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5">
          <Map className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
          <span className="text-[11px] font-medium text-cyan-300">Click the floorplan to place this pin</span>
        </div>
      )}

      {/* Floorplan Canvas */}
      <div className="relative flex-1 overflow-auto p-4">
        <div
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursorPos(null)}
          className={`relative mx-auto aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-xl border bg-slate-900/50 transition-colors ${
            placementMode ? 'cursor-crosshair border-amber-500/50' :
            pendingHazardId ? 'cursor-crosshair border-cyan-500/50' :
            'border-zinc-700/50'
          }`}
        >
          {/* Interactive SVG Factory Layout */}
          <svg viewBox="0 0 100 75" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            {/* Grid pattern */}
            <defs>
              <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(63,63,70,0.12)" strokeWidth="0.15" />
              </pattern>
              <pattern id="diagonalHatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="3" stroke="rgba(82,82,91,0.15)" strokeWidth="0.3" />
              </pattern>
              <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f172a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#18181b" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            <rect width="100" height="75" fill="url(#floorGrad)" />
            <rect width="100" height="75" fill="url(#grid)" />

            {/* Outer walls */}
            <rect x="1" y="1" width="98" height="73" fill="none" stroke="rgba(113,113,122,0.4)" strokeWidth="0.4" rx="0.5" />

            {/* Zone dividers (walls) */}
            {/* A | B divider */}
            <line x1="33" y1="1" x2="33" y2="44" stroke="rgba(82,82,91,0.35)" strokeWidth="0.3" strokeDasharray="1,0.5" />
            {/* B | C divider */}
            <line x1="67" y1="1" x2="67" y2="52" stroke="rgba(82,82,91,0.35)" strokeWidth="0.3" strokeDasharray="1,0.5" />
            {/* Top | Bottom divider */}
            <line x1="1" y1="44" x2="51" y2="44" stroke="rgba(82,82,91,0.35)" strokeWidth="0.3" strokeDasharray="1,0.5" />
            <line x1="51" y1="52" x2="99" y2="52" stroke="rgba(82,82,91,0.35)" strokeWidth="0.3" strokeDasharray="1,0.5" />
            {/* D | E divider */}
            <line x1="51" y1="44" x2="51" y2="75" stroke="rgba(82,82,91,0.35)" strokeWidth="0.3" strokeDasharray="1,0.5" />

            {/* Zone A: Storage racks */}
            <g opacity="0.5">
              <rect x="5" y="6" width="8" height="28" fill="url(#diagonalHatch)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
              <rect x="15" y="6" width="8" height="28" fill="url(#diagonalHatch)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
              <rect x="25" y="6" width="5" height="28" fill="url(#diagonalHatch)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
            </g>

            {/* Zone B: Loading dock with bay doors */}
            <g opacity="0.5">
              <rect x="36" y="6" width="28" height="10" fill="none" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
              <rect x="38" y="2" width="6" height="4" fill="rgba(63,63,70,0.4)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" />
              <rect x="46" y="2" width="6" height="4" fill="rgba(63,63,70,0.4)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" />
              <rect x="54" y="2" width="6" height="4" fill="rgba(63,63,70,0.4)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" />
              <rect x="36" y="20" width="28" height="20" fill="url(#diagonalHatch)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
            </g>

            {/* Zone C: Chemical storage with drums */}
            <g opacity="0.5">
              <circle cx="72" cy="10" r="3" fill="rgba(63,63,70,0.3)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" />
              <circle cx="79" cy="10" r="3" fill="rgba(63,63,70,0.3)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" />
              <circle cx="86" cy="10" r="3" fill="rgba(63,63,70,0.3)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" />
              <circle cx="72" cy="18" r="3" fill="rgba(63,63,70,0.3)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" />
              <circle cx="79" cy="18" r="3" fill="rgba(63,63,70,0.3)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" />
              <rect x="70" y="26" width="26" height="22" fill="url(#diagonalHatch)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
            </g>

            {/* Zone D: Production line */}
            <g opacity="0.5">
              <rect x="6" y="50" width="18" height="14" fill="none" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
              <rect x="26" y="50" width="18" height="14" fill="none" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
              <line x1="6" y1="68" x2="44" y2="68" stroke="rgba(113,113,122,0.25)" strokeWidth="0.2" />
              <line x1="6" y1="70" x2="44" y2="70" stroke="rgba(113,113,122,0.25)" strokeWidth="0.2" />
            </g>

            {/* Zone E: Utility / electrical panels */}
            <g opacity="0.5">
              <rect x="55" y="58" width="8" height="10" fill="none" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
              <rect x="65" y="58" width="8" height="10" fill="none" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
              <rect x="75" y="58" width="8" height="10" fill="none" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
              <rect x="86" y="58" width="10" height="10" fill="rgba(63,63,70,0.2)" stroke="rgba(113,113,122,0.3)" strokeWidth="0.15" rx="0.3" />
            </g>

            {/* Emergency exits (green markers) */}
            <g>
              <rect x="0.5" y="20" width="2" height="4" fill="rgba(16,185,129,0.3)" stroke="rgba(16,185,129,0.5)" strokeWidth="0.15" />
              <rect x="97.5" y="40" width="2" height="4" fill="rgba(16,185,129,0.3)" stroke="rgba(16,185,129,0.5)" strokeWidth="0.15" />
              <rect x="48" y="73" width="4" height="2" fill="rgba(16,185,129,0.3)" stroke="rgba(16,185,129,0.5)" strokeWidth="0.15" />
            </g>

            {/* Entrance (amber) */}
            <rect x="45" y="0.5" width="6" height="2" fill="rgba(245,158,11,0.3)" stroke="rgba(245,158,11,0.5)" strokeWidth="0.15" />
          </svg>

          {/* Zone labels overlay */}
          {zones.map((zone) => {
            const count = hazardCountByZone(zone.id);
            const isHovered = hoveredZone === zone.id;
            return (
              <div
                key={zone.id}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                className="pointer-events-auto absolute"
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.w}%`,
                  height: `${zone.h}%`,
                  backgroundColor: isHovered ? 'rgba(63,63,70,0.06)' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                <div className="absolute left-2 top-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">{zone.label}</span>
                  <span className="ml-1.5 text-[10px] text-zinc-700">{zone.type}</span>
                  {count > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500/20 px-1 text-[10px] font-bold text-red-300">
                      {count}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Placement cursor preview */}
          {placementMode && cursorPos && (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-400/60 bg-amber-500/20 backdrop-blur-sm">
                <Plus className="h-4 w-4 text-amber-300" />
              </div>
              <div className="absolute left-9 top-0 whitespace-nowrap rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-mono text-amber-300">
                {cursorPos.x.toFixed(0)}, {cursorPos.y.toFixed(0)}
              </div>
            </div>
          )}

          {/* Pending hazard cursor preview */}
          {pendingHazardId && !placementMode && cursorPos && (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${cursorPos.x}%`, top: `${cursorPos.y}%` }}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-cyan-400/60 bg-cyan-500/20 backdrop-blur-sm">
                <Map className="h-4 w-4 text-cyan-300" />
              </div>
            </div>
          )}

          {/* Smart placement floating glassmorphism menu */}
          {smartMenu && (
            <>
              {/* Invisible backdrop to close menu */}
              <div
                className="absolute inset-0 z-25"
                onClick={(e) => { e.stopPropagation(); setSmartMenu(null); setSmartSelected(''); }}
              />
              <div
                className="absolute z-30 w-56 rounded-xl border border-white/10 bg-slate-900/80 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl"
                style={{
                  left: `${Math.min(smartMenu.px, (canvasRef.current?.offsetWidth ?? 300) - 230)}px`,
                  top: `${Math.min(smartMenu.py, (canvasRef.current?.offsetHeight ?? 200) - 200)}px`,
                  animation: 'menuFadeIn 0.15s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Place Hazard</span>
                  <button
                    onClick={() => { setSmartMenu(null); setSmartSelected(''); }}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mb-2 text-[9px] text-zinc-500">
                  Coords: ({smartMenu.x}, {smartMenu.y})
                </p>
                <div className="relative mb-2">
                  <select
                    value={smartSelected}
                    onChange={(e) => setSmartSelected(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 pr-7 text-[11px] text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="">Select hazard type...</option>
                    {RULES_LIST.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.title} ({rule.severity})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                </div>
                {smartSelected && RULES_TABLE[smartSelected] && (
                  <div className="mb-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: RULE_SEVERITY_PIN[RULES_TABLE[smartSelected].severity] }}
                      />
                      <span className="text-[10px] font-medium text-zinc-300">{RULES_TABLE[smartSelected].regulation_code}</span>
                    </div>
                    <p className="mt-1 text-[9px] text-zinc-500">{RULES_TABLE[smartSelected].corrective_action}</p>
                  </div>
                )}
                <button
                  onClick={handleSmartConfirm}
                  disabled={!smartSelected}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-bold text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-40"
                >
                  <Check className="h-3 w-3" />
                  Create Pin
                </button>
              </div>
            </>
          )}

          {/* Hazard pins */}
          {hazards.map((hazard, idx) => {
            // Skip pins that haven't been placed yet (zone_x = -1)
            if (hazard.zone_x < 0 || hazard.zone_y < 0) return null;

            const meta = HAZARD_TYPE_META[hazard.type];
            const Icon = ICON_MAP[hazard.type] ?? Flame;
            const sevMeta = SEVERITY_META[hazard.severity];
            const isSelected = selectedHazardId === hazard.id;
            const isPending = pendingHazardId === hazard.id;
            const isResolved = hazard.status === 'resolved';
            // Resolved hazards get an emerald pin with a check icon
            const pinColor = isResolved ? '#10b981' : sevMeta.pinColor;
            const pinGlow = isResolved ? 'rgba(16,185,129,0.5)' : sevMeta.pinGlow;
            const ResolvedIcon = isResolved ? Check : Icon;

            return (
              <button
                key={hazard.id}
                data-hazard-pin="true"
                onClick={(e) => {
                  e.stopPropagation();
                  if (placementMode) return;
                  onSelectHazard(isSelected ? null : hazard.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setModalHazard(hazard);
                }}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125"
                style={{
                  left: `${hazard.zone_x}%`,
                  top: `${hazard.zone_y}%`,
                  animation: `pinDrop 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.08}s both`,
                }}
                title={`${meta.label} — ${sevMeta.label} (double-click for details)`}
              >
                {/* Pulsing glow */}
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-60"
                  style={{ backgroundColor: pinGlow }}
                />
                {/* Pin */}
                <div
                  className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 backdrop-blur-sm"
                  style={{
                    borderColor: pinColor,
                    backgroundColor: `${pinColor}25`,
                    boxShadow: `0 0 12px ${pinGlow}`,
                  }}
                >
                  <ResolvedIcon className="h-4 w-4" style={{ color: pinColor }} />
                </div>
                {/* Selected ring */}
                {isSelected && (
                  <span className="absolute -inset-1.5 rounded-full border-2 border-amber-400" />
                )}
                {/* Pending ring (cyan, for hazards awaiting floorplan placement) */}
                {isPending && (
                  <span className="absolute -inset-2 rounded-full border-2 border-cyan-400 animate-pulse" />
                )}
              </button>
            );
          })}

          {/* Empty state — bottom strip below the floorplan, glassmorphism */}
          {hazards.length === 0 && !placementMode && !pendingHazardId && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-5 py-3 shadow-lg shadow-black/40 backdrop-blur-md">
                <Map className="h-8 w-8 shrink-0 text-zinc-500" />
                <div>
                  <p className="text-sm font-semibold text-white">No hazards mapped yet</p>
                  <p className="text-xs text-zinc-400">Run an inspection or click to place pins</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected hazard quick detail bar */}
      {selectedHazard && (
        <div className="border-t border-zinc-800 bg-zinc-900/60 p-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
              style={{
                borderColor: SEVERITY_META[selectedHazard.severity].pinColor,
                backgroundColor: `${SEVERITY_META[selectedHazard.severity].pinColor}20`,
              }}
            >
              {(() => {
                const Icon = ICON_MAP[selectedHazard.type] ?? Flame;
                return <Icon className="h-4 w-4" style={{ color: SEVERITY_META[selectedHazard.severity].pinColor }} />;
              })()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-sm font-bold text-white">{HAZARD_TYPE_META[selectedHazard.type].label}</h4>
                <span
                  className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    backgroundColor: `${SEVERITY_META[selectedHazard.severity].pinColor}20`,
                    color: SEVERITY_META[selectedHazard.severity].pinColor,
                  }}
                >
                  {selectedHazard.severity}
                </span>
              </div>
              <p className="truncate text-xs text-zinc-400">{selectedHazard.location_label}</p>
            </div>
            <button
              onClick={() => setModalHazard(selectedHazard)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-zinc-700"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Hazard Pin Modal */}
      <HazardPinModal hazard={modalHazard} onClose={() => setModalHazard(null)} onDelete={onDeleteHazard} />

      <style>{`
        @keyframes pinDrop {
          0% { opacity: 0; transform: translate(-50%, -150%) scale(0.5); }
          60% { opacity: 1; transform: translate(-50%, -40%) scale(1.2); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes menuFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
