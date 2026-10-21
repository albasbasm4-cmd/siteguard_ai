export type FacilityType = 'warehouse' | 'chemical_plant' | 'assembly_line';

export interface Facility {
  id: string;
  name: string;
  location: string;
  type: FacilityType;
  created_at: string;
}

export type InspectionStatus = 'running' | 'completed' | 'failed';

export interface Inspection {
  id: string;
  facility_id: string;
  status: InspectionStatus;
  started_at: string;
  completed_at: string | null;
  total_hazards: number;
  compliance_score: number;
  created_at: string;
}

export type HazardType =
  | 'fire'
  | 'chemical'
  | 'electrical'
  | 'fall'
  | 'ppe'
  | 'structural';

export type HazardSeverity = 'critical' | 'high' | 'medium' | 'low';

export type HazardStatus = 'open' | 'acknowledged' | 'resolved';

export type HazardSource = 'ai' | 'inspector';

export type WorkOrderStatus = 'open' | 'in_progress' | 'resolved';

export interface WorkOrder {
  id: string;
  ticketId: string;
  hazardId: string;
  title: string;
  severity: HazardSeverity;
  status: WorkOrderStatus;
  technician: string;
  created_at: string;
  resolved_at: string | null;
}

export const TECHNICIANS = [
  'Marcus Chen',
  'Sofia Rodriguez',
  'Devon Carter',
  'Priya Nair',
] as const;

export const TECHNICIAN_INITIALS: Record<string, string> = {
  'Marcus Chen': 'MC',
  'Sofia Rodriguez': 'SR',
  'Devon Carter': 'DC',
  'Priya Nair': 'PN',
};

export interface Hazard {
  id: string;
  inspection_id: string | null;
  facility_id: string;
  type: HazardType;
  severity: HazardSeverity;
  location_label: string;
  zone_x: number;
  zone_y: number;
  description: string | null;
  regulation: string | null;
  status: HazardStatus;
  detected_at: string;
  estimated_fine: number | null;
  corrective_action: string | null;
  photo_url: string | null;
  source: HazardSource | null;
  confidence: number | null;
  /** Rules table ID (e.g. 'blocked_exit') when the hazard was classified via the rules table */
  rule_id: string | null;
  notes: string | null;
}


export const HAZARD_TYPE_META: Record<
  HazardType,
  { label: string; color: string; bgColor: string; borderColor: string; icon: string }
> = {
  fire: {
    label: 'Fire Hazard',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    borderColor: 'border-orange-500/40',
    icon: 'Flame',
  },
  chemical: {
    label: 'Chemical Spill',
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/15',
    borderColor: 'border-lime-500/40',
    icon: 'FlaskConical',
  },
  electrical: {
    label: 'Electrical Fault',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/15',
    borderColor: 'border-yellow-500/40',
    icon: 'Zap',
  },
  fall: {
    label: 'Fall Risk',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/15',
    borderColor: 'border-sky-500/40',
    icon: 'ArrowDownFromLine',
  },
  ppe: {
    label: 'PPE Violation',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/40',
    icon: 'HardHat',
  },
  structural: {
    label: 'Structural Issue',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/40',
    icon: 'Building2',
  },
};

export const SEVERITY_META: Record<
  HazardSeverity,
  { label: string; color: string; bgColor: string; ring: string; pinColor: string; pinGlow: string }
> = {
  critical: {
    label: 'Critical',
    color: 'text-red-300',
    bgColor: 'bg-red-500/20',
    ring: 'ring-red-500/50',
    pinColor: '#ef4444',
    pinGlow: 'rgba(239,68,68,0.5)',
  },
  high: {
    label: 'High',
    color: 'text-orange-300',
    bgColor: 'bg-orange-500/20',
    ring: 'ring-orange-500/50',
    pinColor: '#f97316',
    pinGlow: 'rgba(249,115,22,0.5)',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
    ring: 'ring-amber-500/50',
    pinColor: '#eab308',
    pinGlow: 'rgba(234,179,8,0.5)',
  },
  low: {
    label: 'Low',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-500/20',
    ring: 'ring-emerald-500/50',
    pinColor: '#3b82f6',
    pinGlow: 'rgba(59,130,246,0.5)',
  },
};

export const REGULATIONS: Record<string, { title: string; description: string }> = {
  'OSHA 1910.157': {
    title: 'Portable Fire Extinguishers',
    description: 'Employer shall provide portable fire extinguishers and shall mount, locate and identify them.',
  },
  'OSHA 1910.1200': {
    title: 'Hazard Communication',
    description: 'Chemical manufacturers and importers shall evaluate chemicals and classify hazards.',
  },
  'OSHA 1910.147': {
    title: 'Lockout/Tagout',
    description: 'Control of hazardous energy during servicing and maintenance of machines.',
  },
  'OSHA 1910.135': {
    title: 'Head Protection',
    description: 'Employer shall ensure each affected employee wears a protective helmet.',
  },
  'OSHA 1910.23': {
    title: 'Fall Protection',
    description: 'Guardrails, safety nets, or personal fall arrest systems required at 4+ feet.',
  },
  'OSHA 1910.303': {
    title: 'Electrical Safety',
    description: 'Electrical equipment shall be free from recognized hazards likely to cause death or serious harm.',
  },
  'NFPA 70E': {
    title: 'Electrical Safety in Workplace',
    description: 'Standard for electrical safety requirements for employee workplaces.',
  },
  'EPA 40 CFR 264': {
    title: 'Hazardous Waste Management',
    description: 'Standards for owners and operators of hazardous waste treatment, storage, and disposal facilities.',
  },
  'OSHA 1910.37': {
    title: 'Means of Egress',
    description: 'Exit routes must be free and unobstructed. No materials or equipment may be placed in exit routes.',
  },
  'OSHA 1910.133': {
    title: 'Eye and Face Protection',
    description: 'Employer shall ensure employees use appropriate eye and/or face protection when exposed to hazards.',
  },
  'OSHA 1910.22': {
    title: 'Walking-Working Surfaces',
    description: 'Employer must keep walking-working surfaces clean, dry, and free of hazards such as loose wires.',
  },
};

export function formatFine(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
