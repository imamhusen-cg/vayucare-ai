import type { AQIData, UserProfile } from '../types';
import { calculateExposureMetrics, normalizeCommuteMode } from './exposure';
import { isMetroCity } from './aqi';

export interface RankedAction {
  id: string;
  title: string;
  subtitle: string;
  savedUg: number;
  savedPct: number;
  badge: string;
}

/**
 * Counterfactual Action Impact Ranker:
 * Re-runs `calculateExposureMetrics` for un-adopted interventions to compute exact
 * estimated μg/day saved and rank the top 3 highest-impact moves for today.
 * Deterministic, zero network latency, works even offline.
 */
export function rankTopActions(
  profile: UserProfile,
  aqiData: AQIData | null
): RankedAction[] {
  const current = calculateExposureMetrics(profile, aqiData);
  const currentDose = current.totalProtectedDoseUg;
  if (currentDose <= 25) return [];

  const normalizedCommute = normalizeCommuteMode(profile.commuteMode);
  const city = aqiData?.city || profile.city || 'Delhi';
  const hasMetro = isMetroCity(city);

  const candidates: Array<{
    id: string;
    title: string;
    subtitle: string;
    badge: string;
    eligible: boolean;
    counterfactual: UserProfile;
  }> = [
    {
      id: 'hepa-purifier',
      title: 'Run indoor HEPA air purifier',
      subtitle: 'Covers 14h indoor home exposure window (~82% indoor assumption)',
      badge: 'Home IAQ',
      eligible: !profile.hasAirPurifier,
      counterfactual: { ...profile, hasAirPurifier: true },
    },
    {
      id: 'n95-mask',
      title: 'Wear a fitted N95 respirator on commute',
      subtitle: 'Conservative ~45% real-world fit factor during open roadside travel',
      badge: 'Masking',
      eligible:
        !profile.hasMask &&
        (normalizedCommute === 'Cycle' || normalizedCommute === 'Auto/Open Transit'),
      counterfactual: { ...profile, hasMask: true },
    },
    {
      id: 'enclosed-transit',
      title: hasMetro ? 'Switch commute to sealed Metro rail' : 'Switch commute to AC cabin car / city bus',
      subtitle: hasMetro
        ? 'Replaces open roadside plumes with filtered underground/elevated rail'
        : 'Uses closed-cabin recirculation instead of open two-wheeler/auto draft',
      badge: 'Commute',
      eligible: normalizedCommute === 'Cycle' || normalizedCommute === 'Auto/Open Transit',
      counterfactual: { ...profile, commuteMode: hasMetro ? 'Metro' : 'Car with AC' },
    },
    {
      id: 'work-from-home',
      title: 'Work From Home today if possible',
      subtitle: 'Eliminates daily roadside commute particulate exposure completely',
      badge: 'Zero Transit',
      eligible: normalizedCommute !== 'Work From Home',
      counterfactual: { ...profile, commuteMode: 'Work From Home' },
    },
  ];

  const ranked: RankedAction[] = [];

  for (const c of candidates) {
    if (!c.eligible) continue;
    const alt = calculateExposureMetrics(c.counterfactual, aqiData);
    const savedUg = Math.max(0, currentDose - alt.totalProtectedDoseUg);
    if (savedUg <= 0) continue;

    const savedPct = Math.max(1, Math.round((savedUg / currentDose) * 100));
    ranked.push({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      savedUg,
      savedPct,
      badge: c.badge,
    });
  }

  return ranked
    .sort((a, b) => b.savedUg - a.savedUg || a.id.localeCompare(b.id))
    .slice(0, 3);
}
