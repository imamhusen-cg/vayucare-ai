import { describe, it, expect } from 'vitest';
import { rankTopActions } from './actionImpact';
import type { AQIData, UserProfile } from '../types';

describe('Action Impact Ranker', () => {
  const sampleAQI: AQIData = {
    status: 'live',
    city: 'Delhi',
    stationName: 'Anand Vihar, Delhi',
    aqi: 240,
    pm25: 102,
    pm10: 165,
    no2: 40,
    o3: 18,
    co: 1.0,
    so2: 12,
    dominentPol: 'pm25',
    lastUpdated: new Date().toISOString(),
    source: 'CPCB',
    aqiCategory: 'Poor',
    isDemoData: false,
  };

  it('produces deterministic, non-negative top 3 actions for unprotected commuter', () => {
    const profile: UserProfile = {
      city: 'Delhi',
      hasKids: false,
      hasSenior: false,
      hasRespiratoryIssues: false,
      commuteMode: 'Auto/Open Transit',
      hasAirPurifier: false,
      hasMask: false,
    };

    const run1 = rankTopActions(profile, sampleAQI);
    const run2 = rankTopActions(profile, sampleAQI);

    expect(run1).toEqual(run2);
    expect(run1.length).toBe(3);
    for (const action of run1) {
      expect(action.savedUg).toBeGreaterThan(0);
      expect(action.savedPct).toBeGreaterThan(0);
    }
    expect(run1[0].savedUg).toBeGreaterThanOrEqual(run1[1].savedUg);
    expect(run1[1].savedUg).toBeGreaterThanOrEqual(run1[2].savedUg);
  });

  it('never recommends actions the profile has already adopted', () => {
    const purifierProfile: UserProfile = {
      city: 'Delhi',
      hasKids: false,
      hasSenior: false,
      hasRespiratoryIssues: false,
      commuteMode: 'Cycle',
      hasAirPurifier: true,
      hasMask: true,
    };

    const actions = rankTopActions(purifierProfile, sampleAQI);
    const ids = actions.map(a => a.id);
    expect(ids).not.toContain('hepa-purifier');
    expect(ids).not.toContain('n95-mask');
  });

  it('returns empty array when user already has HEPA purifier and WFH', () => {
    const peakProfile: UserProfile = {
      city: 'Delhi',
      hasKids: false,
      hasSenior: false,
      hasRespiratoryIssues: false,
      commuteMode: 'Work From Home',
      hasAirPurifier: true,
    };

    const actions = rankTopActions(peakProfile, sampleAQI);
    expect(actions).toEqual([]);
  });
});
