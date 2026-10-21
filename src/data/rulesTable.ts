export interface RuleEntry {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  regulation_code: string;
  estimated_fine_usd: number;
  corrective_action: string;
}

export const RULES_TABLE: Record<string, RuleEntry> = {
  // --- 1. Exit Routes (Subpart E) ---
  blocked_exit: {
    id: 'blocked_exit',
    title: 'Emergency Exit Blocked',
    severity: 'high',
    regulation_code: '29 CFR 1910.37(a)(3)',
    estimated_fine_usd: 16550,
    corrective_action: 'Remove all obstructions from the exit route immediately and keep it clear and unobstructed at all times.',
  },
  locked_emergency_door: {
    id: 'locked_emergency_door',
    title: 'Emergency Door Locked / Latched',
    severity: 'high',
    regulation_code: '29 CFR 1910.36(d)(1)',
    estimated_fine_usd: 16550,
    corrective_action: 'Remove bolts and locks from emergency doors so they open instantly from the inside without a key.',
  },
  missing_exit_sign: {
    id: 'missing_exit_sign',
    title: 'Missing or Unlit Exit Sign',
    severity: 'medium',
    regulation_code: '29 CFR 1910.37(b)(2)',
    estimated_fine_usd: 7000,
    corrective_action: 'Install a clearly visible, illuminated exit sign above the exit door so it is visible to all workers.',
  },
  // --- 2. Fire Protection (Subpart L) ---
  expired_extinguisher: {
    id: 'expired_extinguisher',
    title: 'Expired Fire Extinguisher',
    severity: 'medium',
    regulation_code: '29 CFR 1910.157(e)(3)',
    estimated_fine_usd: 7000,
    corrective_action: 'Service or replace the extinguisher and update the approved annual inspection tag.',
  },
  blocked_fire_extinguisher: {
    id: 'blocked_fire_extinguisher',
    title: 'Fire Extinguisher Blocked or Unmounted',
    severity: 'medium',
    regulation_code: '29 CFR 1910.157(c)(1)',
    estimated_fine_usd: 8000,
    corrective_action: 'Mount the fire extinguisher in its designated place and remove all materials obstructing access.',
  },
  // --- 3. Electrical Safety (Subpart S) ---
  damaged_wiring: {
    id: 'damaged_wiring',
    title: 'Damaged Electrical Wiring',
    severity: 'high',
    regulation_code: '29 CFR 1910.303(b)(1)',
    estimated_fine_usd: 14187,
    corrective_action: 'De-energize the circuit immediately and have a qualified electrician replace the damaged wiring.',
  },
  blocked_electrical_panel: {
    id: 'blocked_electrical_panel',
    title: 'Electrical Panel Access Blocked',
    severity: 'high',
    regulation_code: '29 CFR 1910.303(g)(1)(i)',
    estimated_fine_usd: 12000,
    corrective_action: 'Clear the required working space (30 inches wide and 3 feet deep) in front of the electrical panel.',
  },
  missing_junction_cover: {
    id: 'missing_junction_cover',
    title: 'Missing Electrical Box Cover',
    severity: 'medium',
    regulation_code: '29 CFR 1910.305(b)(2)(i)',
    estimated_fine_usd: 7093,
    corrective_action: 'Cover junction boxes and electrical panels with approved covers to prevent direct contact.',
  },
  flexible_cord_permanently_used: {
    id: 'flexible_cord_permanently_used',
    title: 'Extension Cord Used as Permanent Wiring',
    severity: 'low',
    regulation_code: '29 CFR 1910.305(a)(2)(x)',
    estimated_fine_usd: 3500,
    corrective_action: 'Replace temporary extension cords with approved fixed electrical wiring.',
  },
  missing_gfci_protection: {
    id: 'missing_gfci_protection',
    title: 'Missing GFCI Protection in Wet Areas',
    severity: 'high',
    regulation_code: '29 CFR 1910.304(b)(3)(ii)',
    estimated_fine_usd: 11823,
    corrective_action: 'Install ground-fault circuit interrupters (GFCI) near water sources and wet surfaces.',
  },
  // --- 4. Walking-Working Surfaces & Fall Protection (Subpart D) ---
  unmarked_walkway: {
    id: 'unmarked_walkway',
    title: 'Unmarked Aisle / Walkway',
    severity: 'low',
    regulation_code: '29 CFR 1910.176(a)',
    estimated_fine_usd: 3000,
    corrective_action: 'Apply clear, defined visual markings to permanent aisles and pedestrian walkways.',
  },
  cluttered_aisle: {
    id: 'cluttered_aisle',
    title: 'Cluttered Aisle / Trip Hazard',
    severity: 'low',
    regulation_code: '29 CFR 1910.22(a)(1)',
    estimated_fine_usd: 2500,
    corrective_action: 'Clean and clear aisles and secure loose cables and scattered materials to prevent trips.',
  },
  spill_hazard: {
    id: 'spill_hazard',
    title: 'Floor Spill / Slip Hazard',
    severity: 'medium',
    regulation_code: '29 CFR 1910.22(a)(2)',
    estimated_fine_usd: 5000,
    corrective_action: 'Clean the spill immediately, post slip-hazard warning signs, and fix the source of the leak.',
  },
  unguarded_floor_opening: {
    id: 'unguarded_floor_opening',
    title: 'Unguarded Floor Hole / Pit',
    severity: 'high',
    regulation_code: '29 CFR 1910.28(b)(3)(i)',
    estimated_fine_usd: 16550,
    corrective_action: 'Install standard guardrails or load-rated secure covers over floor openings.',
  },
  missing_mezzanine_guardrail: {
    id: 'missing_mezzanine_guardrail',
    title: 'Missing Guardrail on Elevated Platform',
    severity: 'high',
    regulation_code: '29 CFR 1910.28(b)(1)(i)',
    estimated_fine_usd: 16550,
    corrective_action: 'Install a guardrail with a top rail, mid rail, and toe board around elevated platforms.',
  },
  // --- 5. Hazardous Materials (Subpart H & Z) ---
  unlabeled_chemical_container: {
    id: 'unlabeled_chemical_container',
    title: 'Secondary Chemical Container Unlabeled',
    severity: 'medium',
    regulation_code: '29 CFR 1910.1200(f)(6)',
    estimated_fine_usd: 8000,
    corrective_action: 'Apply the approved GHS hazard-communication label to all secondary chemical containers.',
  },
  missing_sds_binder: {
    id: 'missing_sds_binder',
    title: 'Missing Safety Data Sheets (SDS)',
    severity: 'medium',
    regulation_code: '29 CFR 1910.1200(g)(8)',
    estimated_fine_usd: 7093,
    corrective_action: 'Provide Safety Data Sheets (SDS) and keep them readily accessible to all workers.',
  },
  missing_eyewash_station: {
    id: 'missing_eyewash_station',
    title: 'Missing or Blocked Emergency Eyewash',
    severity: 'high',
    regulation_code: '29 CFR 1910.151(c)',
    estimated_fine_usd: 14187,
    corrective_action: 'Install a working emergency eyewash station within a 10-second walk of chemical handling areas.',
  },
  unsecured_gas_cylinder: {
    id: 'unsecured_gas_cylinder',
    title: 'Unsecured Compressed Gas Cylinder',
    severity: 'high',
    regulation_code: '29 CFR 1910.101(b)',
    estimated_fine_usd: 11823,
    corrective_action: 'Secure compressed gas cylinders upright with chains or dedicated racks.',
  },
  // --- 6. Personal Protective Equipment (Subpart I) ---
  missing_ppe: {
    id: 'missing_ppe',
    title: 'Missing Personal Protective Equipment',
    severity: 'medium',
    regulation_code: '29 CFR 1910.132(a)',
    estimated_fine_usd: 8000,
    corrective_action: 'Provide appropriate PPE and enforce its use before field work begins.',
  },
  missing_respiratory_program: {
    id: 'missing_respiratory_program',
    title: 'Lack of Respiratory Protection Program',
    severity: 'high',
    regulation_code: '29 CFR 1910.134(c)(1)',
    estimated_fine_usd: 14187,
    corrective_action: 'Create a written respiratory protection program and provide fit-tested, compliant respirators.',
  },
  missing_eye_protection: {
    id: 'missing_eye_protection',
    title: 'Missing Eye / Face Protection',
    severity: 'high',
    regulation_code: '29 CFR 1910.133(a)(1)',
    estimated_fine_usd: 11823,
    corrective_action: 'Require workers to use safety glasses or face shields during cutting and grinding.',
  },
  // --- 7. Machine Guarding & LOTO (Subpart O & J) ---
  missing_machine_guarding: {
    id: 'missing_machine_guarding',
    title: 'Missing Machine Guarding at Point of Operation',
    severity: 'high',
    regulation_code: '29 CFR 1910.212(a)(1)',
    estimated_fine_usd: 16550,
    corrective_action: 'Install mechanical guards around points of operation and rotating or moving machine parts.',
  },
  missing_loto_procedure: {
    id: 'missing_loto_procedure',
    title: 'Failure to Apply Lockout/Tagout (LOTO)',
    severity: 'high',
    regulation_code: '29 CFR 1910.147(c)(4)(i)',
    estimated_fine_usd: 16550,
    corrective_action: 'Apply energy-isolation lockout/tagout procedures before starting any maintenance work.',
  },
  missing_bench_grinder_guard: {
    id: 'missing_bench_grinder_guard',
    title: 'Bench Grinder Tongue Guard Gap > 1/4 in',
    severity: 'medium',
    regulation_code: '29 CFR 1910.215(b)(9)',
    estimated_fine_usd: 7093,
    corrective_action: 'Adjust the tongue guard so the gap between it and the grinding wheel does not exceed 1/4 inch.',
  },
  // --- 8. Materials Handling & Forklifts (Subpart N) ---
  unstable_material_storage: {
    id: 'unstable_material_storage',
    title: 'Unstable or Improperly Stacked Storage',
    severity: 'high',
    regulation_code: '29 CFR 1910.176(b)',
    estimated_fine_usd: 14187,
    corrective_action: 'Restack boxes and materials on shelves in a balanced, secure arrangement against sliding.',
  },
  operating_damaged_forklift: {
    id: 'operating_damaged_forklift',
    title: 'Operating Damaged Forklift',
    severity: 'high',
    regulation_code: '29 CFR 1910.178(q)(7)',
    estimated_fine_usd: 11823,
    corrective_action: 'Take damaged forklifts out of service immediately and complete a mechanical inspection before operation.',
  },
  untrained_forklift_operator: {
    id: 'untrained_forklift_operator',
    title: 'Untrained Forklift Operator',
    severity: 'high',
    regulation_code: '29 CFR 1910.178(l)(1)(i)',
    estimated_fine_usd: 14187,
    corrective_action: 'Train and formally certify forklift operators before allowing them to complete loading tasks.',
  },
  // --- 9. Medical & First Aid (Subpart J & K) ---
  insufficient_first_aid_supplies: {
    id: 'insufficient_first_aid_supplies',
    title: 'Inadequate First Aid Supplies',
    severity: 'low',
    regulation_code: '29 CFR 1910.151(b)',
    estimated_fine_usd: 3500,
    corrective_action: 'Provide fully stocked first aid kits at the work site.',
  },
  blocked_safety_shower: {
    id: 'blocked_safety_shower',
    title: 'Blocked Safety Shower Access',
    severity: 'medium',
    regulation_code: '29 CFR 1910.151(c)',
    estimated_fine_usd: 9457,
    corrective_action: 'Clear the path to the emergency shower completely and keep it free of goods and equipment.',
  },
};

export const RULES_LIST: RuleEntry[] = Object.values(RULES_TABLE);

export const FINE_FOOTNOTE =
  'Estimates only. Final penalties are set by OSHA. The inspector makes the final decision.';

export type HazardSource = 'ai' | 'inspector';
