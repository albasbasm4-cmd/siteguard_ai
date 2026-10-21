import type { Hazard } from '@/types';

const STORAGE_KEY_PREFIX = 'siteguard_hazards_';

export function saveHazardsToStorage(facilityId: string, hazards: Hazard[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${facilityId}`, JSON.stringify(hazards));
  } catch {
    // localStorage might be full or unavailable — silently ignore
  }
}

export function loadHazardsFromStorage(facilityId: string): Hazard[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${facilityId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Hazard[];
  } catch {
    return [];
  }
}

export function clearHazardsFromStorage(facilityId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${facilityId}`);
  } catch {
    // ignore
  }
}
