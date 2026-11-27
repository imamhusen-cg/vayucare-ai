import { describe, it, expect } from 'vitest';
import {
  aqiToCPCBPM25,
  enforceParticulatePhysics,
  getCPCBScaleCategory,
  getAQIColor,
  getAQIBadgeClass,
  getWHOMultiplier,
  isMetroCity,
  getAQIAmbientGlowColor,
  formatPollutant,
  formatTimeAgo,
  formatTimestamp,
} from './aqi';

describe('Official CPCB IND-AQI PM2.5 Conversion', () => {
  it('converts AQI in Good range (0-50)', () => {
    expect(aqiToCPCBPM25(0)).toBe(15);
    expect(aqiToCPCBPM25(25)).toBe(15);
    expect(aqiToCPCBPM25(50)).toBe(30);
  });

  it('converts AQI in Satisfactory range (51-100)', () => {
    expect(aqiToCPCBPM25(85)).toBe(51);
    expect(aqiToCPCBPM25(100)).toBe(60);
  });

  it('converts AQI in Moderate range (101-200)', () => {
    expect(aqiToCPCBPM25(153)).toBe(76);
    expect(aqiToCPCBPM25(198)).toBe(89);
    expect(aqiToCPCBPM25(200)).toBe(90);
  });

  it('converts AQI in Poor range (201-300)', () => {
    expect(aqiToCPCBPM25(250)).toBe(105);
    expect(aqiToCPCBPM25(300)).toBe(120);
  });

  it('converts AQI in Very Poor range (301-400)', () => {
    expect(aqiToCPCBPM25(350)).toBe(185);
    expect(aqiToCPCBPM25(400)).toBe(250);
  });

  it('converts AQI in Severe range (401-500)', () => {
    expect(aqiToCPCBPM25(450)).toBe(315);
    expect(aqiToCPCBPM25(500)).toBe(380);
  });

  it('handles out of bounds gracefully', () => {
    expect(aqiToCPCBPM25(-10)).toBe(15);
    expect(aqiToCPCBPM25(600)).toBe(510);
  });
});

describe('Physical Particulate Constraints (Honest Station Pass-through vs Missing Fallback)', () => {
  it('estimates PM2.5 and PM10 from CPCB breakpoints and marks estimated flags when sensor readings are missing', () => {
    const res = enforceParticulatePhysics(150, null, null);
    expect(res.pm25).toBe(75);
    expect(res.pm25Estimated).toBe(true);
    expect(res.pm10).toBe(Math.round(75 * 1.55));
    expect(res.pm10Estimated).toBe(true);
  });

  it('passes real reported sensor readings through untouched without silent rewriting', () => {
    const res = enforceParticulatePhysics(200, 90, 60);
    expect(res.pm25).toBe(90);
    expect(res.pm25Estimated).toBe(false);
    expect(res.pm10).toBe(60);
    expect(res.pm10Estimated).toBe(false);
  });

  it('preserves realistic sensor packets where PM10 is already higher', () => {
    const res = enforceParticulatePhysics(200, 90, 140);
    expect(res.pm25).toBe(90);
    expect(res.pm10).toBe(140);
    expect(res.pm25Estimated).toBe(false);
    expect(res.pm10Estimated).toBe(false);
  });
});

describe('CPCB Scale Categories and Badges', () => {
  it('returns exact CPCB categories for index ranges', () => {
    expect(getCPCBScaleCategory(35)).toBe('Good');
    expect(getCPCBScaleCategory(75)).toBe('Satisfactory');
    expect(getCPCBScaleCategory(150)).toBe('Moderate');
    expect(getCPCBScaleCategory(250)).toBe('Poor');
    expect(getCPCBScaleCategory(350)).toBe('Very Poor');
    expect(getCPCBScaleCategory(450)).toBe('Severe');
  });

  it('provides matching tailwind color classes', () => {
    expect(getAQIColor(40)).toBe('text-[#4cc38a]');
    expect(getAQIColor(80)).toBe('text-[#84cc16]');
    expect(getAQIColor(150)).toBe('text-[#eab308]');
    expect(getAQIColor(250)).toBe('text-[#f97316]');
    expect(getAQIColor(350)).toBe('text-[#ef4444]');
    expect(getAQIColor(450)).toBe('text-[#dc2626]');
  });

  it('returns valid badge classes', () => {
    expect(getAQIBadgeClass(40)).toContain('border');
    expect(getAQIBadgeClass(150)).toContain('border');
  });
});

describe('WHO 24h Guideline Multiplier', () => {
  it('computes realistic multiplier based on 15 ug/m3 limit', () => {
    expect(getWHOMultiplier(30)).toBe('2.0× WHO limit');
    expect(getWHOMultiplier(75)).toBe('5.0× WHO limit');
    expect(getWHOMultiplier(15)).toBe('1.0× WHO limit');
    expect(getWHOMultiplier(10)).toBe('Within WHO 24h limit');
    expect(getWHOMultiplier(0)).toBe('');
  });
});

describe('Metro City Registry', () => {
  it('recognizes verified metro rail cities', () => {
    expect(isMetroCity('Delhi')).toBe(true);
    expect(isMetroCity('New Delhi')).toBe(true);
    expect(isMetroCity('Mumbai')).toBe(true);
    expect(isMetroCity('Bengaluru')).toBe(true);
    expect(isMetroCity('Chennai')).toBe(true);
    expect(isMetroCity('Kolkata')).toBe(true);
  });

  it('returns false for cities without active metro networks', () => {
    expect(isMetroCity('Kota')).toBe(false);
    expect(isMetroCity('Mangalore')).toBe(false);
    expect(isMetroCity('Shimla')).toBe(false);
    expect(isMetroCity('')).toBe(false);
  });
});

describe('Atmospheric Ambient Glow', () => {
  it('returns smooth radial gradients for each category', () => {
    const goodGlow = getAQIAmbientGlowColor(40);
    expect(goodGlow.hex).toBe('#10B981');
    expect(goodGlow.gradient).toContain('radial-gradient');

    const severeGlow = getAQIAmbientGlowColor(450);
    expect(severeGlow.hex).toBe('#BE123C');
    expect(severeGlow.gradient).toContain('radial-gradient');
  });
});

describe('Telemetry Formatting Utilities', () => {
  it('formats pollutant values with units', () => {
    expect(formatPollutant(85.4)).toBe('85.4 μg/m³');
    expect(formatPollutant(null)).toBe('—');
  });

  it('formats relative and timestamp strings', () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe('Just synced');
    expect(formatTimestamp(now)).toBeTruthy();
  });
});
