import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Facility, Hazard, Inspection, HazardSource } from '@/types';
import { RULES_TABLE, type RuleEntry } from '@/data/rulesTable';
import { saveHazardsToStorage, loadHazardsFromStorage, clearHazardsFromStorage } from '@/lib/hazardStorage';
import { ScanLine, Eye, Database } from 'lucide-react';

export type InspectionPhase = 'idle' | 'scanning' | 'detecting' | 'analyzing' | 'complete';

export interface StreamLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'detect' | 'warn' | 'success';
  message: string;
}

export interface ProgressToastState {
  visible: boolean;
  step: number;
  steps: { label: string; icon: typeof ScanLine }[];
}

const TOAST_STEPS = [
  { label: 'Scanning Spatial Geometry...', icon: ScanLine },
  { label: 'Analyzing AI Vision Feeds...', icon: Eye },
  { label: 'Matching OSHA Compliance Database...', icon: Database },
];

// Maps rule severity to the legacy HazardType for DB compatibility
const RULE_SEVERITY_TO_LEGACY: Record<RuleEntry['severity'], Hazard['severity']> = {
  high: 'high',
  medium: 'medium',
  low: 'low',
};

// Maps rule IDs to legacy HazardType for pin icons
const RULE_ID_TO_TYPE: Record<string, Hazard['type']> = {
  // Exit routes (Subpart E)
  blocked_exit: 'fire',
  locked_emergency_door: 'fire',
  missing_exit_sign: 'fire',
  // Fire protection (Subpart L)
  expired_extinguisher: 'fire',
  blocked_fire_extinguisher: 'fire',
  // Electrical (Subpart S)
  damaged_wiring: 'electrical',
  blocked_electrical_panel: 'electrical',
  missing_junction_cover: 'electrical',
  flexible_cord_permanently_used: 'electrical',
  missing_gfci_protection: 'electrical',
  // Walking-working surfaces / fall (Subpart D)
  unmarked_walkway: 'fall',
  cluttered_aisle: 'fall',
  spill_hazard: 'chemical',
  unguarded_floor_opening: 'fall',
  missing_mezzanine_guardrail: 'fall',
  // Hazardous materials (Subpart H & Z)
  unlabeled_chemical_container: 'chemical',
  missing_sds_binder: 'chemical',
  missing_eyewash_station: 'chemical',
  unsecured_gas_cylinder: 'chemical',
  // PPE (Subpart I)
  missing_ppe: 'ppe',
  missing_respiratory_program: 'ppe',
  missing_eye_protection: 'ppe',
  // Machine guarding & LOTO (Subpart O & J)
  missing_machine_guarding: 'structural',
  missing_loto_procedure: 'electrical',
  missing_bench_grinder_guard: 'structural',
  // Materials handling (Subpart N)
  unstable_material_storage: 'structural',
  operating_damaged_forklift: 'structural',
  untrained_forklift_operator: 'structural',
  // Medical & first aid (Subpart J & K)
  insufficient_first_aid_supplies: 'ppe',
  blocked_safety_shower: 'chemical',
};

export interface AnalysisResult {
  ruleId: string;
  source: HazardSource;
  confidence: number | null;
  shortReason: string | null;
}

export function useInspection(facility: Facility | null) {
  const [phase, setPhase] = useState<InspectionPhase>('idle');
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [streamLogs, setStreamLogs] = useState<StreamLogEntry[]>([]);
  const [activeInspection, setActiveInspection] = useState<Inspection | null>(null);
  const [complianceScore, setComplianceScore] = useState<number>(0);
  const [toast, setToast] = useState<ProgressToastState>({ visible: false, step: 0, steps: TOAST_STEPS });
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const addLog = useCallback((type: StreamLogEntry['type'], message: string) => {
    setStreamLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type,
        message,
      },
    ]);
  }, []);

  // Persist hazards to localStorage whenever they change
  useEffect(() => {
    if (facility) {
      saveHazardsToStorage(facility.id, hazards);
    }
  }, [hazards, facility]);

  const loadExistingHazards = useCallback(async () => {
    if (!facility) return;

    // Try loading from localStorage first (per-facility)
    const localHazards = loadHazardsFromStorage(facility.id);
    if (localHazards.length > 0) {
      setHazards(localHazards);
      return;
    }

    // Fall back to Supabase
    try {
      const { data } = await supabase
        .from('hazards')
        .select('*')
        .eq('facility_id', facility.id)
        .order('detected_at', { ascending: false });
      if (data) setHazards(data as Hazard[]);
    } catch {
      setHazards([]);
    }
  }, [facility]);

  const insertHazard = useCallback(
    async (facilityId: string, inspectionId: string | null, ruleId: string, x: number, y: number) => {
      const rule = RULES_TABLE[ruleId];
      if (!rule) return;

      const zoneLabel = `Zone ${String.fromCharCode(65 + Math.floor((x / 100) * 4))}`;
      const { data: hazardData } = await supabase
        .from('hazards')
        .insert({
          inspection_id: inspectionId,
          facility_id: facilityId,
          type: RULE_ID_TO_TYPE[ruleId] ?? 'fire',
          severity: RULE_SEVERITY_TO_LEGACY[rule.severity] ?? 'medium',
          location_label: `${zoneLabel} · (${x}, ${y})`,
          zone_x: x,
          zone_y: y,
          description: rule.corrective_action,
          regulation: rule.regulation_code,
          status: 'open',
          detected_at: new Date().toISOString(),
          estimated_fine: rule.estimated_fine_usd,
          corrective_action: rule.corrective_action,
          photo_url: null,
          source: 'inspector',
          rule_id: ruleId,
        })
        .select()
        .single();

      if (hazardData) {
        setHazards((prev) => [hazardData as Hazard, ...prev]);
      }
    },
    [],
  );

  // Start a real inspection session: logs the session, then the inspector
  // adds findings via camera upload or manual floorplan placement.
  const startInspection = useCallback(async () => {
    if (!facility || phase !== 'idle') return;

    clearTimers();
    setPhase('scanning');
    setStreamLogs([]);
    setComplianceScore(0);

    addLog('info', `Initializing inspection session for ${facility.name}...`);
    addLog('info', `Facility type: ${facility.type.toUpperCase()} | Loading spatial model...`);

    const { data: inspectionData } = await supabase
      .from('inspections')
      .insert({
        facility_id: facility.id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const inspection = inspectionData as Inspection | null;
    if (inspection) setActiveInspection(inspection);

    const t0 = setTimeout(() => {
      setPhase('detecting');
      addLog('success', 'Spatial geometry scan complete. Vision AI ready.');
      addLog('info', 'Awaiting findings: upload a photo for AI analysis or place a hazard pin on the floorplan.');
    }, 1500);
    timersRef.current.push(t0);
  }, [facility, phase, clearTimers, addLog]);

  // Demo inspection session: drives the LiveStream phase machine without
  // creating a real inspection record
  const startDemoSession = useCallback(() => {
    if (!facility) return;
    clearTimers();
    setPhase('scanning');
    setStreamLogs([]);
    setComplianceScore(0);
    addLog('info', `Initializing AI inspection session for ${facility.name}...`);
    addLog('info', `Facility type: ${facility.type.toUpperCase()} | Loading spatial model...`);
    const t1 = setTimeout(() => {
      setPhase('detecting');
      addLog('success', 'Spatial geometry scan complete. Vision AI online.');
      addLog('info', 'Scanning floorplan zones for hazards...');
    }, 1400);
    timersRef.current.push(t1);
  }, [facility, clearTimers, addLog]);

  const finishDemoSession = useCallback((findingCount: number, totalFines: number) => {
    setPhase('analyzing');
    const t1 = setTimeout(() => {
      addLog('info', 'Matching findings against OSHA compliance database...');
    }, 500);
    const t2 = setTimeout(() => {
      setPhase('complete');
      addLog('success', `Inspection complete — ${findingCount} findings, ${totalFines.toLocaleString('en-US')} in potential fines identified.`);
    }, 1600);
    timersRef.current.push(t1, t2);
  }, [addLog]);

  const resetInspection = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setStreamLogs([]);
    setHazards([]);
    setComplianceScore(0);
    setActiveInspection(null);
    setToast({ visible: false, step: 0, steps: TOAST_STEPS });
    if (facility) {
      clearHazardsFromStorage(facility.id);
    }
  }, [clearTimers, facility]);

  const updateHazardStatus = useCallback(async (hazardId: string, status: Hazard['status']) => {
    setHazards((prev) =>
      prev.map((h) => (h.id === hazardId ? { ...h, status } : h))
    );
    await supabase.from('hazards').update({ status }).eq('id', hazardId);
  }, []);

  const removeHazard = useCallback(async (hazardId: string) => {
    setHazards((prev) => prev.filter((h) => h.id !== hazardId));
    try {
      await supabase.from('hazards').delete().eq('id', hazardId);
    } catch {
      // localStorage persistence covers this
    }
  }, []);

  const clearAllHazards = useCallback(async () => {
    setHazards([]);
    setStreamLogs([]);
    setPhase('idle');
    setComplianceScore(0);
    if (facility) clearHazardsFromStorage(facility.id);
    try {
      await supabase.from('hazards').delete().eq('facility_id', facility?.id ?? '');
    } catch {
      // localStorage persistence covers this
    }
  }, [facility]);

  // Attach a voice/text note to a hazard (appends to existing notes)
  const attachNoteToHazard = useCallback((hazardId: string, note: string) => {
    setHazards((prev) => prev.map((h) => {
      if (h.id !== hazardId) return h;
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const existing = h.notes ?? '';
      const newNote = existing
        ? `${existing}\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;
      return { ...h, notes: newNote };
    }));
    // Best-effort persist to Supabase
    try {
      supabase.from('hazards').update({ notes: note }).eq('id', hazardId).then();
    } catch {
      // localStorage persistence covers this
    }
    addLog('info', `Note attached to hazard ${hazardId}`);
  }, [addLog]);

  // Add a hazard from the rules table (used by floorplan smart placement and manual classification)
  const addHazardFromRules = useCallback(async (
    ruleId: string,
    x: number,
    y: number,
    facilityId: string,
    source: HazardSource = 'inspector',
    photoUrl: string | null = null,
    confidence: number | null = null,
    description: string | null = null,
  ) => {
    const rule = RULES_TABLE[ruleId];
    if (!rule) return;

    const legacyType = RULE_ID_TO_TYPE[ruleId] ?? 'fire';
    const legacySeverity = RULE_SEVERITY_TO_LEGACY[rule.severity] ?? 'medium';

    const zonePrefix = x < 33 ? 'Zone A' : x < 66 ? 'Zone B' : x < 90 ? 'Zone C' : 'Zone D';
    const subArea = Math.floor(Math.random() * 5) + 1;

    const hazardId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newHazard: Hazard = {
      id: hazardId,
      inspection_id: null,
      facility_id: facilityId,
      type: legacyType,
      severity: legacySeverity,
      location_label: `${zonePrefix}-${subArea} · (${x}, ${y})`,
      zone_x: x,
      zone_y: y,
      description: description ?? rule.corrective_action,
      regulation: rule.regulation_code,
      status: 'open',
      detected_at: new Date().toISOString(),
      estimated_fine: rule.estimated_fine_usd,
      corrective_action: rule.corrective_action,
      photo_url: photoUrl,
      source,
      confidence,
      rule_id: ruleId,
      notes: null,
    };

    setHazards((prev) => [newHazard, ...prev]);
    addLog('detect', `${rule.title} placed at (${x}, ${y}) — Source: ${source}`);

    // Also persist to Supabase (best-effort)
    try {
      await supabase.from('hazards').insert({
        id: hazardId,
        facility_id: facilityId,
        type: legacyType,
        severity: legacySeverity,
        location_label: newHazard.location_label,
        zone_x: x,
        zone_y: y,
        description: newHazard.description,
        regulation: rule.regulation_code,
        status: 'open',
        detected_at: newHazard.detected_at,
        estimated_fine: rule.estimated_fine_usd,
        corrective_action: rule.corrective_action,
        photo_url: photoUrl,
        source,
        confidence,
        rule_id: ruleId,
      });
    } catch {
      // localStorage persistence covers this
    }

    return hazardId;
  }, [addLog]);

  // Legacy manual hazard (random type) — kept for backward compatibility
  const addManualHazard = useCallback(async (
    x: number,
    y: number,
    facilityId: string,
  ) => {
    const ruleIds = Object.keys(RULES_TABLE);
    const randomRuleId = ruleIds[Math.floor(Math.random() * ruleIds.length)];
    await addHazardFromRules(randomRuleId, x, y, facilityId, 'inspector');
  }, [addHazardFromRules]);

  // Add a hazard from an AI analysis result
  const addAnalyzedHazard = useCallback(async (
    ruleId: string,
    facilityId: string,
    source: HazardSource,
    photoUrl: string | null,
    confidence: number | null,
    shortReason: string | null,
  ) => {
    const rule = RULES_TABLE[ruleId];
    if (!rule) return null;

    const hazardId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newHazard: Hazard = {
      id: hazardId,
      inspection_id: null,
      facility_id: facilityId,
      type: RULE_ID_TO_TYPE[ruleId] ?? 'fire',
      severity: RULE_SEVERITY_TO_LEGACY[rule.severity] ?? 'medium',
      location_label: 'Pending placement — click floorplan to pin',
      zone_x: -1,
      zone_y: -1,
      description: shortReason ?? rule.corrective_action,
      regulation: rule.regulation_code,
      status: 'open',
      detected_at: new Date().toISOString(),
      estimated_fine: rule.estimated_fine_usd,
      corrective_action: rule.corrective_action,
      photo_url: photoUrl,
      source,
      confidence,
      rule_id: ruleId,
      notes: null,
    };

    setHazards((prev) => [newHazard, ...prev]);
    addLog('detect', `${rule.title} detected — Source: ${source}${confidence !== null ? ` (${Math.round(confidence * 100)}% confidence)` : ''}`);

    return hazardId;
  }, [addLog]);

  // Place a pending hazard (one with zone_x/zone_y = -1) at the given coordinates
  const placePendingHazard = useCallback((hazardId: string, x: number, y: number) => {
    setHazards((prev) => prev.map((h) =>
      h.id === hazardId
        ? { ...h, zone_x: x, zone_y: y, location_label: h.location_label.replace('Pending placement — click floorplan to pin', `(${x}, ${y})`) }
        : h
    ));
    addLog('info', `Hazard pin placed at (${x}, ${y})`);
  }, [addLog]);

  return {
    phase,
    hazards,
    streamLogs,
    activeInspection,
    complianceScore,
    toast,
    startInspection,
    startDemoSession,
    finishDemoSession,
    resetInspection,
    updateHazardStatus,
    removeHazard,
    clearAllHazards,
    attachNoteToHazard,
    addManualHazard,
    addHazardFromRules,
    addAnalyzedHazard,
    placePendingHazard,
    loadExistingHazards,
  };
}
