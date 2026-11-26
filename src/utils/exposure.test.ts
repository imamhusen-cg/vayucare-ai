import { describe, it, expect } from 'vitest';
import {
  normalizeCommuteMode,
  getAmbientPM25,
  calculateExposureMetrics,
} from './exposure';
import type { UserProfile, AQIData } from '../types';

describe('Exposure & Inhalation Engine', () => {
  const baseProfile: UserProfile = {
    city: 'Delhi',
    hasKids: false,
    hasSenior: false,
    hasRespiratoryIssues: false,
    commuteMode: 'Cycle',
    hasAirPurifier: false,
  };

  const sampleAQI: AQIData = {
    status: 'live',
    city: 'Delhi',
    stationName: 'Anand Vihar, Delhi',
    aqi: 200,
    pm25: 90,
    pm10: 150,
    o3: 15,
    no2: 45,
    so2: 10,
    co: 1,
    dominentPol: 'pm25',
    lastUpdated: new Date().toISOString(),
    source: 'CPCB',
    aqiCategory: 'Moderate',
    isDemoData: false,
  };

  describe('Commute Mode Normalization', () => {
    it('normalizes common input variants', () => {
      expect(normalizeCommuteMode('Cycle')).toBe('Cycle');
      expect(normalizeCommuteMode('Bicycle')).toBe('Cycle');
      expect(normalizeCommuteMode('Auto/Open Transit')).toBe('Auto/Open Transit');
      expect(normalizeCommuteMode('rickshaw')).toBe('Auto/Open Transit');
      expect(normalizeCommuteMode('Car with AC')).toBe('Car with AC');
      expect(normalizeCommuteMode('Metro')).toBe('Metro');
      expect(normalizeCommuteMode('Work From Home')).toBe('Work From Home');
      expect(normalizeCommuteMode('')).toBe('Car with AC');
    });
  });

  describe('Ambient PM2.5 Extraction', () => {
    it('derives PM2.5 accurately from CPCB standard', () => {
      expect(getAmbientPM25(sampleAQI)).toBe(90);
      expect(getAmbientPM25(null)).toBeGreaterThan(0);
    });
  });

  describe('Dose and Mitigation Calculations', () => {
    it('computes baseline unprotected dose for open transit without purifier', () => {
      const exposure = calculateExposureMetrics(baseProfile, sampleAQI);
      expect(exposure.baselineUnprotectedDoseUg).toBeGreaterThan(0);
      expect(exposure.totalProtectedDoseUg).toBe(exposure.baselineUnprotectedDoseUg);
      expect(exposure.totalMitigationPct).toBe(0);
      expect(exposure.totalSavedDoseUg).toBe(0);
    });

    it('toggling HEPA purifier visibly increases mitigation percentage and reduces dose', () => {
      const withPurifier: UserProfile = { ...baseProfile, hasAirPurifier: true };
      const exposure = calculateExposureMetrics(withPurifier, sampleAQI);

      expect(exposure.totalSavedDoseUg).toBeGreaterThan(0);
      expect(exposure.totalProtectedDoseUg).toBeLessThan(exposure.baselineUnprotectedDoseUg);
      expect(exposure.homeAirProtectionPct).toBeGreaterThan(0);
      expect(exposure.totalMitigationPct).toBe(exposure.homeAirProtectionPct + exposure.commuteProtectionPct);
    });

    it('switching to enclosed commute with AC car or metro adds commute protection', () => {
      const enclosedProfile: UserProfile = { ...baseProfile, commuteMode: 'Car with AC' };
      const exposure = calculateExposureMetrics(enclosedProfile, sampleAQI);

      expect(exposure.commuteProtectionPct).toBe(25);
      expect(exposure.totalMitigationPct).toBeGreaterThanOrEqual(25);
    });

    it('combining HEPA purifier + WFH achieves peak mitigation', () => {
      const peakShieldProfile: UserProfile = {
        ...baseProfile,
        hasAirPurifier: true,
        commuteMode: 'Work From Home',
      };
      const exposure = calculateExposureMetrics(peakShieldProfile, sampleAQI);

      expect(exposure.totalMitigationPct).toBeGreaterThan(60);
      expect(exposure.cigsSaved).toBeGreaterThan(0);
      expect(exposure.cigsAfter).toBeLessThan(exposure.cigsBefore);
    });

    it('applies physiological vulnerability multipliers for sensitive household members', () => {
      const vulnerableProfile: UserProfile = {
        ...baseProfile,
        hasKids: true,
        hasSenior: true,
        hasRespiratoryIssues: true,
      };
      const baseExposure = calculateExposureMetrics(baseProfile, sampleAQI);
      const vulnExposure = calculateExposureMetrics(vulnerableProfile, sampleAQI);

      expect(vulnExposure.baselineUnprotectedDoseUg).toBeGreaterThan(baseExposure.baselineUnprotectedDoseUg);
      expect(vulnExposure.vulnerabilityLabel).toContain('Child');
    });

    it('calculates Berkeley Earth cigarette equivalent reduction correctly', () => {
      const withHEPA: UserProfile = { ...baseProfile, hasAirPurifier: true };
      const exposure = calculateExposureMetrics(withHEPA, sampleAQI);

      expect(exposure.cigsBefore).toBeGreaterThan(0);
      expect(exposure.cigsAfter).toBeLessThanOrEqual(exposure.cigsBefore);
      expect(exposure.cigsSaved).toBe(Number((exposure.cigsBefore - exposure.cigsAfter).toFixed(1)));
    });
  });

  describe('City Transit Awareness in Exposure Labels', () => {
    it('shows sealed rail metro for metro cities', () => {
      const delhiProfile: UserProfile = { ...baseProfile, city: 'Delhi', commuteMode: 'Metro' };
      const exposure = calculateExposureMetrics(delhiProfile, sampleAQI);
      expect(exposure.hasMetro).toBe(true);
      expect(exposure.commuteEfficiencyText).toContain('Sealed Metro Rail');
    });

    it('adapts to AC city bus for non-metro cities like Kota', () => {
      const kotaProfile: UserProfile = { ...baseProfile, city: 'Kota', commuteMode: 'Metro' };
      const exposure = calculateExposureMetrics(kotaProfile, { ...sampleAQI, city: 'Kota' });
      expect(exposure.hasMetro).toBe(false);
      expect(exposure.commuteEfficiencyText).toContain('Enclosed AC City Bus');
    });
  });
});
