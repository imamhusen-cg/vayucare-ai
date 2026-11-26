import type { UserProfile, AQIData } from '../types';
import { enforceParticulatePhysics, isMetroCity } from './aqi';

export interface ExposureMetrics {
  ambientPM25: number;
  // Dose metrics (μg / day)
  baselineUnprotectedDoseUg: number;
  totalProtectedDoseUg: number;
  totalSavedDoseUg: number;
  // 2-part Mitigation Breakdown (%)
  totalMitigationPct: number;
  homeAirProtectionPct: number;
  commuteProtectionPct: number;
  // Berkeley Earth "Cigarette Equivalent" (24h exposure ÷ 22 μg/m³)
  cigsBefore: number;
  cigsAfter: number;
  cigsSaved: number;
  // Contextual text & statuses
  commuteEfficiencyText: string;
  purifierEfficiencyText: string;
  vulnerabilityLabel: string | null;
  riskCategory: 'Low' | 'Moderate' | 'High' | 'Severe';
  riskBadgeClass: string;
  protectionColorClass: string;
  hasMetro: boolean;
}

/**
 * Normalizes commute mode variants into standard exposure categories
 */
export function normalizeCommuteMode(mode: string): 'Cycle' | 'Auto/Open Transit' | 'Car with AC' | 'Metro' | 'Work From Home' {
  if (!mode) return 'Car with AC';
  const lower = mode.toLowerCase();
  if (lower.includes('cycle') || lower.includes('bike') || lower.includes('bicycle')) return 'Cycle';
  if (lower.includes('auto') || lower.includes('two-wheeler') || lower.includes('open') || lower.includes('rickshaw')) return 'Auto/Open Transit';
  if (lower.includes('metro') || lower.includes('train') || lower.includes('rail')) return 'Metro';
  if (lower.includes('home') || lower.includes('wfh')) return 'Work From Home';
  return 'Car with AC';
}

/**
 * Derives ambient PM2.5 in μg/m³ from AQIData strictly following CPCB IND-AQI sub-index breakpoints
 */
export function getAmbientPM25(aqiData: AQIData | null): number {
  const aqi = aqiData?.aqi || 150;
  const rawPm25 = aqiData?.pm25 != null ? aqiData.pm25 : null;
  const rawPm10 = aqiData?.pm10 != null ? aqiData.pm10 : null;
  const { pm25 } = enforceParticulatePhysics(aqi, rawPm25, rawPm10);
  return pm25;
}

/**
 * Calculates 24-hour PM2.5 inhaled dose, 2-part mitigation breakdown, and Berkeley Earth cigarette equivalence:
 * 1. Baseline Unprotected Dose: Active city PM2.5 + vulnerability multipliers + natural infiltration + open transit.
 * 2. Protected Dose: Savings from HEPA indoor air filtration (14h) + enclosed commute/WFH shielding (2h).
 * 3. 2-Part Breakdown: Home Air Protection % vs Commute Protection %.
 * 4. Berkeley Earth Cigarette Equivalent: 24h exposure ÷ 22 μg/m³ equivalent (330 μg inhaled PM2.5 per cigarette).
 */
export function calculateExposureMetrics(
  profile: UserProfile,
  aqiData: AQIData | null
): ExposureMetrics {
  const ambientPM25 = Math.max(10, getAmbientPM25(aqiData));
  const commute = normalizeCommuteMode(profile.commuteMode);
  const city = aqiData?.city || profile?.city || 'Delhi';
  const hasMetro = isMetroCity(city);

  // 1. Vulnerability Multiplier (Physiological burden)
  // - Children: developing alveoli, +25% higher minute ventilation per kg
  // - Asthma/COPD: hyperactive airways, +30% deeper bronchial retention
  // - Seniors: reduced mucociliary clearance, +15% vascular susceptibility
  let vulnMultiplier = 1.0;
  const vulnLabels: string[] = [];
  if (profile.hasKids) {
    vulnMultiplier += 0.25;
    vulnLabels.push('Child lung factor (+25%)');
  }
  if (profile.hasRespiratoryIssues) {
    vulnMultiplier += 0.30;
    vulnLabels.push('Asthma airway sensitivity (+30%)');
  }
  if (profile.hasSenior) {
    vulnMultiplier += 0.15;
    vulnLabels.push('Senior pulmonary reserve (+15%)');
  }

  // 2. Baseline Unprotected Dose (Active City + Vulnerability Multipliers + Open Exposure)
  // - Home: 14 hours at 0.45 m³/hr, natural infiltration (75% of ambient PM2.5) = 4.725 * ambientPM25
  const baselineHomeDose = ambientPM25 * 0.75 * 0.45 * 14;
  // - Workplace/School: 8 hours at 0.65 m³/hr, unfiltered (65% of ambient PM2.5) = 3.38 * ambientPM25
  const baselineWorkDose = ambientPM25 * 0.65 * 0.65 * 8;
  // - Commute: 2 hours at 1.20 m³/hr, open roadside exposure (130% of ambient PM2.5) = 3.12 * ambientPM25
  const baselineCommuteDose = ambientPM25 * 1.30 * 1.20 * 2;

  const rawBaselineTotal = baselineHomeDose + baselineWorkDose + baselineCommuteDose;
  const baselineUnprotectedDoseUg = Math.round(rawBaselineTotal * vulnMultiplier);

  // 3. Home Air Shield (Indoor HEPA Purifier vs Natural Infiltration)
  // True HEPA filtration lowers indoor particulate to ~18% (or clean room baseline of 12 μg/m³)
  let homeSavingsUg = 0;
  let homeAirProtectionPct = 0;
  let purifierEfficiencyText = 'Natural Infiltration (+42% ambient PM2.5)';

  if (profile.hasAirPurifier) {
    const protectedHomeConc = Math.min(ambientPM25 * 0.18, 14);
    const protectedHomeDose = protectedHomeConc * 0.45 * 14;
    const rawHomeSaved = Math.max(0, baselineHomeDose - protectedHomeDose);
    homeSavingsUg = Math.round(rawHomeSaved * vulnMultiplier);
    // Home mitigation percentage of total daily unprotected dose (typically 38% - 46%)
    homeAirProtectionPct = Math.round((homeSavingsUg / baselineUnprotectedDoseUg) * 100);
    purifierEfficiencyText = `HEPA Filtration Active (-82% indoor PM2.5 • +${homeAirProtectionPct}% shield)`;
  }

  // 4. Commute Shield (Enclosed Cabin / Metro / WFH vs Open Roadside)
  let commuteSavingsUg = 0;
  let commuteProtectionPct = 0;
  let commuteEfficiencyText = '';

  switch (commute) {
    case 'Cycle':
      // Open roadside direct exposure + exertion hyperventilation (1.75 m³/hr)
      commuteSavingsUg = 0;
      commuteProtectionPct = 0;
      commuteEfficiencyText = 'High Exertion Roadside (+125% exposure, 2.5× respiration)';
      break;

    case 'Auto/Open Transit':
      // Roadside tailpipe exhaust and dust draft
      const autoCommuteDose = ambientPM25 * 1.30 * 0.90 * 2;
      const rawAutoSaved = Math.max(0, baselineCommuteDose - autoCommuteDose);
      commuteSavingsUg = Math.round(rawAutoSaved * vulnMultiplier);
      commuteProtectionPct = Math.max(0, Math.round((commuteSavingsUg / baselineUnprotectedDoseUg) * 100));
      commuteEfficiencyText = 'Open Roadside Draft (Direct tailpipe & particulate drift)';
      break;

    case 'Car with AC':
      // Recirculated cabin air filter blocks ~68% of particulate
      const carCommuteDose = ambientPM25 * 0.32 * 0.50 * 2;
      const rawCarSaved = Math.max(0, baselineCommuteDose - carCommuteDose);
      commuteSavingsUg = Math.round(rawCarSaved * vulnMultiplier);
      commuteProtectionPct = Math.round((commuteSavingsUg / baselineUnprotectedDoseUg) * 100);
      commuteEfficiencyText = `Recirculated Cabin Filter (-68% cabin particulate • +${commuteProtectionPct}% shield)`;
      break;

    case 'Metro':
      // Sealed transit / AC coach (or AC city bus for non-metro cities)
      const metroCommuteDose = ambientPM25 * 0.42 * 0.65 * 2;
      const rawMetroSaved = Math.max(0, baselineCommuteDose - metroCommuteDose);
      commuteSavingsUg = Math.round(rawMetroSaved * vulnMultiplier);
      commuteProtectionPct = Math.round((commuteSavingsUg / baselineUnprotectedDoseUg) * 100);
      commuteEfficiencyText = hasMetro
        ? `Sealed Metro Rail (-58% commuter particulate • +${commuteProtectionPct}% shield)`
        : `Enclosed AC City Bus (-55% particulate • +${commuteProtectionPct}% shield)`;
      break;

    case 'Work From Home':
      // 0 commute hours, 100% transit emission avoided
      commuteSavingsUg = Math.round(baselineCommuteDose * vulnMultiplier);
      commuteProtectionPct = Math.round((commuteSavingsUg / baselineUnprotectedDoseUg) * 100);
      commuteEfficiencyText = `Zero Commute (100% transit particulate avoided • +${commuteProtectionPct}% shield)`;
      break;
  }

  // 5. Total Combined Mitigation (Home + Commute)
  const totalSavedDoseUg = homeSavingsUg + commuteSavingsUg;
  const rawTotalPct = homeAirProtectionPct + commuteProtectionPct;
  const totalMitigationPct = Math.min(95, Math.max(0, rawTotalPct));
  const totalProtectedDoseUg = Math.max(25, baselineUnprotectedDoseUg - totalSavedDoseUg);

  // 6. Berkeley Earth Cigarette Equivalence (24h exposure ÷ 22 μg/m³ equivalent)
  // An adult inhales ~15 m³ air/day. 22 μg/m³ * 15 m³ = 330 μg PM2.5 per cigarette.
  const CIGARETTE_UG_EQUIV = 330;
  const cigsBefore = Math.max(0.1, Number((baselineUnprotectedDoseUg / CIGARETTE_UG_EQUIV).toFixed(1)));
  const cigsAfter = Math.max(0.1, Number((totalProtectedDoseUg / CIGARETTE_UG_EQUIV).toFixed(1)));
  const cigsSaved = Math.max(0, Number((cigsBefore - cigsAfter).toFixed(1)));

  // Risk categorization
  let riskCategory: 'Low' | 'Moderate' | 'High' | 'Severe' = 'Moderate';
  let riskBadgeClass = 'text-[#eab308] bg-[#eab308]/10 border-[#eab308]/25';
  if (totalProtectedDoseUg < 200) {
    riskCategory = 'Low';
    riskBadgeClass = 'text-[#4cc38a] bg-[#4cc38a]/10 border-[#4cc38a]/25';
  } else if (totalProtectedDoseUg < 450) {
    riskCategory = 'Moderate';
    riskBadgeClass = 'text-[#eab308] bg-[#eab308]/10 border-[#eab308]/25';
  } else if (totalProtectedDoseUg < 750) {
    riskCategory = 'High';
    riskBadgeClass = 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/25';
  } else {
    riskCategory = 'Severe';
    riskBadgeClass = 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/25';
  }

  let protectionColorClass = 'text-[#4cc38a]';
  if (totalMitigationPct < 25) protectionColorClass = 'text-[#f97316]';
  else if (totalMitigationPct < 50) protectionColorClass = 'text-[#eab308]';
  else if (totalMitigationPct >= 65) protectionColorClass = 'text-[#38bdf8]';

  return {
    ambientPM25,
    baselineUnprotectedDoseUg,
    totalProtectedDoseUg,
    totalSavedDoseUg,
    totalMitigationPct,
    homeAirProtectionPct,
    commuteProtectionPct,
    cigsBefore,
    cigsAfter,
    cigsSaved,
    commuteEfficiencyText,
    purifierEfficiencyText,
    vulnerabilityLabel: vulnLabels.length > 0 ? vulnLabels.join(' • ') : null,
    riskCategory,
    riskBadgeClass,
    protectionColorClass,
    hasMetro,
  };
}
