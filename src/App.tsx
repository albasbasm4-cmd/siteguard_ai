import { useState, useEffect, useCallback, useRef } from 'react';
import { Map, Radio, BarChart3, ShieldCheck, Wrench, FlaskConical, Scale } from 'lucide-react';
import { Header } from '@/components/Header';
import { FloorplanMap } from '@/components/FloorplanMap';
import { LiveStream } from '@/components/LiveStream';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { CameraUploadZone } from '@/components/CameraUploadZone';
import { VoiceNoteRecorder } from '@/components/VoiceNoteRecorder';
import { HazardsFeed } from '@/components/HazardsFeed';
import { RegulationMatcher } from '@/components/RegulationMatcher';
import { ProgressToast } from '@/components/ProgressToast';
import { ComplianceReportModal } from '@/components/ComplianceReportModal';
import { MaintenanceDispatch } from '@/components/MaintenanceDispatch';
import { RulesAndFines } from '@/components/RulesAndFines';
import { useFacilities } from '@/hooks/useFacilities';
import { useInspection } from '@/hooks/useInspection';
import { useMaintenance } from '@/hooks/useMaintenance';
import { RULES_TABLE } from '@/data/rulesTable';
import type { Facility, HazardSource } from '@/types';

type TabId = 'floorplan' | 'stream' | 'analytics' | 'dispatch' | 'rules';

const TABS: { id: TabId; label: string; icon: typeof Map }[] = [
  { id: 'floorplan', label: 'Floorplan Spatial Map', icon: Map },
  { id: 'stream', label: 'Live Inspection Stream', icon: Radio },
  { id: 'analytics', label: 'Analytics Dashboard', icon: BarChart3 },
  { id: 'dispatch', label: 'Maintenance Dispatch', icon: Wrench },
  { id: 'rules', label: 'Regulations & Fines', icon: Scale },
];

function App() {
  const { facilities, loading } = useFacilities();
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('floorplan');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const [pendingHazardId, setPendingHazardId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [tabsScroll, setTabsScroll] = useState<{ atStart: boolean; atEnd: boolean } | null>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({});

  const {
    phase,
    hazards,
    streamLogs,
    complianceScore,
    toast,
    resetInspection,
    startDemoSession,
    finishDemoSession,
    updateHazardStatus,
    removeHazard,
    clearAllHazards,
    attachNoteToHazard,
    addManualHazard,
    addHazardFromRules,
    addAnalyzedHazard,
    placePendingHazard,
    loadExistingHazards,
  } = useInspection(selectedFacility);

  const {
    tickets,
    updateTicketStatus,
    assignTechnician,
    clearAllTickets,
  } = useMaintenance(hazards);

  useEffect(() => {
    if (facilities.length > 0 && !selectedFacility) {
      setSelectedFacility(facilities[0]);
    }
  }, [facilities, selectedFacility]);

  useEffect(() => {
    if (selectedFacility) {
      loadExistingHazards().then(() => setInitialLoadDone(true));
    }
  }, [selectedFacility, loadExistingHazards]);

  const handleSelectFacility = useCallback((f: Facility) => {
    setSelectedFacility(f);
    setSelectedHazardId(null);
    resetInspection();
  }, [resetInspection]);

  const handleExport = useCallback(() => {
    setReportOpen(true);
  }, []);

  const handlePlaceHazard = useCallback((x: number, y: number) => {
    if (selectedFacility) {
      addManualHazard(x, y, selectedFacility.id);
    }
  }, [selectedFacility, addManualHazard]);

  const handlePlaceHazardByRule = useCallback((ruleId: string, x: number, y: number) => {
    if (selectedFacility) {
      addHazardFromRules(ruleId, x, y, selectedFacility.id, 'inspector');
    }
  }, [selectedFacility, addHazardFromRules]);

  const handlePlacePendingHazard = useCallback((hazardId: string, x: number, y: number) => {
    placePendingHazard(hazardId, x, y);
    setPendingHazardId(null);
    setSelectedHazardId(hazardId);
  }, [placePendingHazard]);

  const handleResolveHazard = useCallback((hazardId: string, resolved: boolean) => {
    updateHazardStatus(hazardId, resolved ? 'resolved' : 'open');
  }, [updateHazardStatus]);

  const handleDeleteHazard = useCallback(async (hazardId: string) => {
    await removeHazard(hazardId);
    setSelectedHazardId(null);
  }, [removeHazard]);

  // Demo mode: nine findings across severities, spread across the floorplan
  // so pins never overlap
  const DEMO_HAZARDS: { ruleId: string; x: number; y: number }[] = [
    { ruleId: 'blocked_exit', x: 8, y: 12 },
    { ruleId: 'damaged_wiring', x: 30, y: 20 },
    { ruleId: 'missing_machine_guarding', x: 70, y: 15 },
    { ruleId: 'unguarded_floor_opening', x: 88, y: 40 },
    { ruleId: 'expired_extinguisher', x: 15, y: 50 },
    { ruleId: 'spill_hazard', x: 48, y: 45 },
    { ruleId: 'unlabeled_chemical_container', x: 75, y: 68 },
    { ruleId: 'missing_ppe', x: 35, y: 78 },
    { ruleId: 'cluttered_aisle', x: 60, y: 88 },
  ];
  const [demoHazardIds, setDemoHazardIds] = useState<string[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const demoAutoRan = useRef(false);

  const handleDemoMode = useCallback(async () => {
    if (demoLoading || !selectedFacility) return;
    setDemoLoading(true);
    if (demoHazardIds.length === 0) {
      startDemoSession();
      await new Promise((r) => setTimeout(r, 1800));
      const ids: string[] = [];
      let totalFines = 0;
      for (const item of DEMO_HAZARDS) {
        const id = await addHazardFromRules(item.ruleId, item.x, item.y, selectedFacility.id, 'ai');
        if (id) {
          ids.push(id);
          totalFines += RULES_TABLE[item.ruleId]?.estimated_fine_usd ?? 0;
        }
        await new Promise((r) => setTimeout(r, 350));
      }
      setDemoHazardIds(ids);
      finishDemoSession(ids.length, totalFines);
      setActiveTab('floorplan');
    } else {
      for (const id of demoHazardIds) {
        await removeHazard(id);
      }
      setDemoHazardIds([]);
    }
    setDemoLoading(false);
  }, [demoLoading, selectedFacility, demoHazardIds, addHazardFromRules, removeHazard, startDemoSession, finishDemoSession]);

  // Clear all wipes every piece of related data: work orders, hazard pins
  // (Supabase + localStorage), analytics inputs, demo state, and the stream
  const handleClearAll = useCallback(async () => {
    clearAllTickets();
    await clearAllHazards();
    setDemoHazardIds([]);
    setSelectedHazardId(null);
    setPendingHazardId(null);
  }, [clearAllTickets, clearAllHazards]);

  // Auto-run demo on first load so the app never opens empty
  useEffect(() => {
    if (demoAutoRan.current || !initialLoadDone || !selectedFacility) return;
    demoAutoRan.current = true;
    if (hazards.length === 0) {
      handleDemoMode();
    }
  }, [initialLoadDone, selectedFacility, hazards.length, handleDemoMode]);

  const handleAddToReport = useCallback(async (
    ruleId: string,
    source: HazardSource,
    photoUrl: string | null,
    confidence: number | null,
    shortReason: string | null,
  ) => {
    if (!selectedFacility) return;
    const newId = await addAnalyzedHazard(ruleId, selectedFacility.id, source, photoUrl, confidence, shortReason);
    if (newId) {
      setPendingHazardId(newId);
      setActiveTab('floorplan');
      setMobileSidebarOpen(false);
    }
  }, [selectedFacility, addAnalyzedHazard]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="relative mx-auto h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-400" />
            <div className="absolute inset-2 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-500">Loading SiteGuard AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header
        facilities={facilities}
        selectedFacility={selectedFacility}
        onSelectFacility={handleSelectFacility}
        onExport={handleExport}
        isRunning={false}
      />

      {/* Mobile tab switch for sidebar */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-slate-950 px-4 py-2 lg:hidden">
        <button
          onClick={() => setMobileSidebarOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
          {mobileSidebarOpen ? 'Hide' : 'Show'} Inspection Panel
        </button>
        <button
          onClick={handleDemoMode}
          disabled={demoLoading || !selectedFacility}
          className={`ml-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
            demoHazardIds.length > 0
              ? 'border-red-500/50 bg-red-500/15 text-red-300 hover:bg-red-500/25'
              : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          {demoLoading ? 'Working...' : demoHazardIds.length > 0 ? 'Exit Demo Mode' : 'Demo Mode'}
        </button>
      </div>
      <div className="flex h-[calc(100dvh-105px)] flex-col lg:h-[calc(100dvh-57px)] lg:flex-row">
        {/* Left Panel - Main Workspace (65%) */}
        <div
          className={`${
            mobileSidebarOpen ? 'hidden' : 'flex'
          } flex-col lg:flex lg:w-[65%] xl:w-[65%]`}
        >
          {/* Tabs — horizontally scrollable within its own strip on mobile */}
          <div className="relative border-b border-zinc-800 bg-slate-900/40">
            <div
              ref={tabsScrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                setTabsScroll({ atStart: el.scrollLeft < 8, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
              }}
              className="flex items-center gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabButtonRefs.current[tab.id] = el; }}
                  onClick={() => {
                    setActiveTab(tab.id);
                    tabButtonRefs.current[tab.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }}
                  className={`relative flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors md:px-4 ${
                    isActive
                      ? 'text-amber-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500" />
                  )}
                </button>
              );
            })}
            </div>
            {tabsScroll && !tabsScroll.atStart && (
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-900 to-transparent" />
            )}
            {tabsScroll && !tabsScroll.atEnd && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-900 to-transparent" />
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden bg-slate-900/20">
            {activeTab === 'floorplan' && (
              <FloorplanMap
                hazards={hazards}
                facilityType={selectedFacility?.type ?? 'warehouse'}
                onPlaceHazard={handlePlaceHazard}
                onPlaceHazardByRule={handlePlaceHazardByRule}
                onPlacePendingHazard={handlePlacePendingHazard}
                pendingHazardId={pendingHazardId}
                selectedHazardId={selectedHazardId}
                onSelectHazard={setSelectedHazardId}
                onDeleteHazard={handleDeleteHazard}
              />
            )}
            {activeTab === 'stream' && (
              <LiveStream
                logs={streamLogs}
                phase={phase}
                facilityName={selectedFacility?.name ?? '—'}
              />
            )}  
            {activeTab === 'analytics' && (
              <AnalyticsDashboard hazards={hazards} complianceScore={complianceScore} tickets={tickets} />
            )}
            {activeTab === 'dispatch' && (
              <MaintenanceDispatch
                tickets={tickets}
                hazards={hazards}
                onUpdateTicketStatus={updateTicketStatus}
                onAssignTechnician={assignTechnician}
                onResolveHazard={handleResolveHazard}
                onClearAllTickets={handleClearAll}
              />
            )}
            {activeTab === 'rules' && <RulesAndFines />}
          </div>
        </div>

        {/* Right Panel - Inspection Sidebar (35%) */}
        <aside
          className={`${
            mobileSidebarOpen ? 'flex' : 'hidden'
          } w-full flex-col border-t border-zinc-800 bg-slate-900 lg:flex lg:w-[35%] lg:border-l lg:border-t-0`}
        >
          <div className="space-y-3 overflow-y-auto p-3">
            <CameraUploadZone
              facilityId={selectedFacility?.id ?? ''}
              onAddToReport={handleAddToReport}
            />
            <VoiceNoteRecorder
              selectedHazardId={selectedHazardId}
              onAttachNote={attachNoteToHazard}
            />
            <HazardsFeed hazards={hazards} onUpdateStatus={updateHazardStatus} />
            <RegulationMatcher hazards={hazards} />
          </div>
        </aside>
      </div>

      {/* Progress Toast */}
      <ProgressToast data={toast} />

      {/* Compliance Report Modal */}
      <ComplianceReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        hazards={hazards}
        facility={selectedFacility}
        complianceScore={complianceScore}
        tickets={tickets}
      />
    </div>
  );
}

export default App;
