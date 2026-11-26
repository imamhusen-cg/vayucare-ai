import { describe, it, expect } from 'vitest';
import { buildFallbackAdvisory } from './advisories';
import type { AQIData } from '../types';

const sampleAQI: AQIData = {
  status: 'live',
  city: 'Delhi',
  aqi: 260,
  pm25: 108,
  pm10: 167,
  no2: 45,
  o3: 20,
  co: 1.1,
  so2: 12,
  dominentPol: 'pm25',
  stationName: 'Anand Vihar',
  lastUpdated: '2026-11-26T12:00:00Z',
  source: 'CPCB',
  aqiCategory: 'Poor',
  isDemoData: false,
};

describe('buildFallbackAdvisory', () => {
  it('generates English and Hindi advisories for all audiences', () => {
    for (const audience of ['rwa', 'family', 'school'] as const) {
      const en = buildFallbackAdvisory(sampleAQI, audience, 'en');
      const hi = buildFallbackAdvisory(sampleAQI, audience, 'hi');

      expect(en).toContain('Delhi');
      expect(en).toContain('260 (Poor)');
      expect(en).toContain('108 µg/m³');

      expect(hi).toContain('Delhi');
      expect(hi).toContain('260 (Poor)');
      expect(hi).toContain('वायुकेयर');
    }
  });

  it('handles null PM2.5 gracefully with em-dash placeholder', () => {
    const nullPmAQI: AQIData = { ...sampleAQI, pm25: null };
    const en = buildFallbackAdvisory(nullPmAQI, 'rwa', 'en');
    expect(en).toContain('— µg/m³');
  });
});
