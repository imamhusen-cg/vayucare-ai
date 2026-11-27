import type { AQICategory } from '../types';

/**
 * Official Central Pollution Control Board (CPCB) National Air Quality Index (IND-AQI)
 * Breakpoints:
 * 0–50:    Good (Green)
 * 51–100:  Satisfactory (Light Green)
 * 101–200: Moderate (Yellow / Amber)
 * 201–300: Poor (Orange)
 * 301–400: Very Poor (Red)
 * 401–500: Severe (Maroon / Dark Red)
 */
export function getCPCBScaleCategory(aqi: number): AQICategory {
  if (!Number.isFinite(aqi) || aqi === null) return 'Moderate';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

export function getAQIColor(aqi: number): string {
  if (!Number.isFinite(aqi)) return 'text-[#eab308]';
  if (aqi <= 50) return 'text-[#4cc38a]'; // Good (0–50)
  if (aqi <= 100) return 'text-[#84cc16]'; // Satisfactory (51–100)
  if (aqi <= 200) return 'text-[#eab308]'; // Moderate (101–200)
  if (aqi <= 300) return 'text-[#f97316]'; // Poor (201–300)
  if (aqi <= 400) return 'text-[#ef4444]'; // Very Poor (301–400)
  return 'text-[#dc2626]'; // Severe (401–500+)
}

export function getAQIBadgeClass(aqi: number): string {
  if (!Number.isFinite(aqi)) return 'text-[#eab308] bg-[#eab308]/10 border-[#eab308]/20';
  if (aqi <= 50) return 'text-[#4cc38a] bg-[#4cc38a]/10 border-[#4cc38a]/20';
  if (aqi <= 100) return 'text-[#84cc16] bg-[#84cc16]/10 border-[#84cc16]/20';
  if (aqi <= 200) return 'text-[#eab308] bg-[#eab308]/10 border-[#eab308]/20';
  if (aqi <= 300) return 'text-[#f97316] bg-[#f97316]/10 border-[#f97316]/20';
  if (aqi <= 400) return 'text-[#ef4444] bg-[#ef4444]/10 border-[#ef4444]/20';
  return 'text-[#f87171] bg-[#991b1b]/20 border-[#991b1b]/35';
}

/**
 * Dynamic Atmospheric Theme: Soft radial ambient glow behind the hero AQI card
 * Shifts smoothly based on active CPCB category:
 * - Good / Satisfactory (0–100): Emerald #10B981
 * - Moderate (101–200):          Warm Amber #F59E0B
 * - Poor (201–300):              Orange #F97316
 * - Very Poor (301–400):         Red #EF4444
 * - Severe (401–500):            Crimson #BE123C
 */
export function getAQIAmbientGlowColor(aqi: number): { hex: string; rgba: string; gradient: string } {
  if (isNaN(aqi) || aqi <= 100) {
    return {
      hex: '#10B981',
      rgba: 'rgba(16, 185, 129, 0.18)',
      gradient: 'radial-gradient(circle at 35% 25%, rgba(16, 185, 129, 0.18) 0%, rgba(6, 9, 15, 0) 70%)',
    };
  }
  if (aqi <= 200) {
    return {
      hex: '#F59E0B',
      rgba: 'rgba(245, 158, 11, 0.18)',
      gradient: 'radial-gradient(circle at 35% 25%, rgba(245, 158, 11, 0.18) 0%, rgba(6, 9, 15, 0) 70%)',
    };
  }
  if (aqi <= 300) {
    return {
      hex: '#F97316',
      rgba: 'rgba(249, 115, 22, 0.19)',
      gradient: 'radial-gradient(circle at 35% 25%, rgba(249, 115, 22, 0.19) 0%, rgba(6, 9, 15, 0) 70%)',
    };
  }
  if (aqi <= 400) {
    return {
      hex: '#EF4444',
      rgba: 'rgba(239, 68, 68, 0.20)',
      gradient: 'radial-gradient(circle at 35% 25%, rgba(239, 68, 68, 0.20) 0%, rgba(6, 9, 15, 0) 70%)',
    };
  }
  return {
    hex: '#BE123C',
    rgba: 'rgba(190, 18, 60, 0.22)',
    gradient: 'radial-gradient(circle at 35% 25%, rgba(190, 18, 60, 0.22) 0%, rgba(6, 9, 15, 0) 70%)',
  };
}

export function formatPollutant(value: number | null, unit = 'μg/m³'): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)} ${unit}`;
}

export function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

export function getWHOMultiplier(pm25: number | null): string {
  if (!pm25 || pm25 <= 0) return '';
  const who24hLimit = 15; // WHO 24h air quality guideline: 15 μg/m³
  const mult = pm25 / who24hLimit;
  if (mult < 1.0) return 'Within WHO 24h limit';
  return `${mult.toFixed(1)}× WHO limit`;
}

/**
 * Computes realistic PM2.5 concentration (μg/m³) from official CPCB IND-AQI sub-index breakpoints:
 * - 0–50 AQI (Good):          0–30 μg/m³   (slope: 0.6)
 * - 51–100 AQI (Satisfactory): 31–60 μg/m³  (slope: 0.6; e.g. AQI 85 ≈ 51 μg/m³)
 * - 101–200 AQI (Moderate):    61–90 μg/m³  (slope: 0.3; e.g. AQI 153 ≈ 76 μg/m³, AQI 198 ≈ 89 μg/m³)
 * - 201–300 AQI (Poor):        91–120 μg/m³ (slope: 0.3)
 * - 301–400 AQI (Very Poor):   121–250 μg/m³(slope: 1.3)
 * - 401–500 AQI (Severe):      251–380 μg/m³(slope: 1.3)
 */
export function aqiToCPCBPM25(aqi: number): number {
  if (isNaN(aqi) || aqi <= 0) return 15;
  if (aqi <= 50) return Math.round(aqi * 0.6);
  if (aqi <= 100) return Math.round(30 + (aqi - 50) * 0.6);
  if (aqi <= 200) return Math.round(60 + (aqi - 100) * 0.3);
  if (aqi <= 300) return Math.round(90 + (aqi - 200) * 0.3);
  if (aqi <= 400) return Math.round(120 + (aqi - 300) * 1.3);
  return Math.round(250 + (aqi - 400) * 1.3);
}

/**
 * Passes through real measured particulate readings when reported by the station.
 * Falls back to CPCB IND-AQI sub-index estimation only when a reading is missing,
 * and surfaces `pm25Estimated` / `pm10Estimated` flags so telemetry remains transparent.
 */
export function enforceParticulatePhysics(
  aqi: number,
  rawPm25: number | null,
  rawPm10: number | null
): { pm25: number; pm10: number; pm25Estimated: boolean; pm10Estimated: boolean } {
  const cpcbExpected = aqiToCPCBPM25(aqi);
  let pm25: number;
  let pm25Estimated = false;

  if (rawPm25 == null || !Number.isFinite(rawPm25) || rawPm25 <= 0) {
    pm25 = cpcbExpected;
    pm25Estimated = true;
  } else {
    pm25 = Math.round(rawPm25);
  }

  let pm10: number;
  let pm10Estimated = false;
  if (rawPm10 == null || !Number.isFinite(rawPm10) || rawPm10 <= 0) {
    pm10 = Math.round(pm25 * 1.55);
    pm10Estimated = true;
  } else {
    pm10 = Math.round(rawPm10);
  }

  return { pm25, pm10, pm25Estimated, pm10Estimated };
}

/**
 * Metro-City Registry: Official Indian cities with operational Metro rapid rail networks
 */
export const METRO_CITIES = [
  'delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon', 'faridabad', 'ghaziabad', 'greater noida',
  'mumbai', 'navi mumbai', 'thane',
  'bengaluru', 'bangalore',
  'kolkata',
  'hyderabad',
  'chennai',
  'pune',
  'jaipur',
  'lucknow',
  'kochi',
  'ahmedabad',
  'nagpur',
  'kanpur'
];

export function isMetroCity(cityName: string): boolean {
  if (!cityName) return false;
  const name = cityName.toLowerCase().trim();
  return METRO_CITIES.some(m => name.includes(m) || m.includes(name));
}

export function formatTimeAgo(iso: string): string {
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    if (isNaN(diffMs)) return 'Current cycle';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 5) return 'Just synced';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1h ago';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return 'Current cycle';
  }
}
