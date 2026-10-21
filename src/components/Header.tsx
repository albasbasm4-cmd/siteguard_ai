import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, ChevronDown, FileDown, Radio, MapPin, Factory } from 'lucide-react';
import type { Facility } from '@/types';

interface HeaderProps {
  facilities: Facility[];
  selectedFacility: Facility | null;
  onSelectFacility: (f: Facility) => void;
  onExport: () => void;
  isRunning: boolean;
}

export function Header({
  facilities,
  selectedFacility,
  onSelectFacility,
  onExport,
  isRunning,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const facilityIcon = (type: string) => {
    if (type === 'chemical_plant') return <FlaskConical />;
    if (type === 'assembly_line') return <Factory />;
    return <MapPin />;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-slate-950">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        {/* Logo & Name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 ring-1 ring-amber-500/30">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-950"></span>
            </span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold tracking-tight text-white">
              SiteGuard <span className="text-amber-400">AI</span>
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-400/80">
              Industrial Safety Inspection
            </p>
          </div>
        </div>

        {/* Facility Selector */}
        <div className="relative flex-1 max-w-xs" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-800/60"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-amber-400/70 shrink-0">{selectedFacility ? facilityIcon(selectedFacility.type) : <MapPin />}</span>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-semibold text-white">
                  {selectedFacility?.name ?? 'Select Facility'}
                </p>
                <p className="truncate text-[11px] text-zinc-400">
                  {selectedFacility?.location ?? '—'}
                </p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute mt-2 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
              {facilities.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onSelectFacility(f);
                    setDropdownOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 ${
                    selectedFacility?.id === f.id ? 'bg-amber-500/10' : ''
                  }`}
                >
                  <span className="text-amber-400/70">{facilityIcon(f.type)}</span>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-white">{f.name}</p>
                    <p className="truncate text-[11px] text-zinc-400">{f.location}</p>
                  </div>
                  {selectedFacility?.id === f.id && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Export Button */}
          <button
            onClick={onExport}
            className="hidden items-center gap-2 rounded-lg border border-zinc-700/60 bg-zinc-900/60 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white md:flex"
          >
            <FileDown className="h-4 w-4" />
            Export Report
          </button>

          {/* Run Inspection Button */}
          <button
            onClick={onExport}
            disabled={isRunning}
            className="group relative flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-50 md:px-4"
          >
            <Radio className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
            <span className="hidden md:inline">{isRunning ? 'Inspecting...' : 'Start Inspection'}</span>
            <span className="md:hidden">{isRunning ? 'Running' : 'Run'}</span>
            {!isRunning && (
              <span className="absolute inset-0 animate-pulse rounded-lg ring-2 ring-amber-400/40" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function FlaskConical() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.95" />
    </svg>
  );
}
