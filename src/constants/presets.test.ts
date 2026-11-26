import { describe, it, expect } from 'vitest';
import { DEMO_PRESETS, INDIAN_CITIES } from './presets';

describe('Demo Presets & Indian Cities Registry', () => {
  it('contains valid and complete persona presets', () => {
    expect(DEMO_PRESETS.length).toBeGreaterThanOrEqual(3);

    for (const preset of DEMO_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.label).toBeTruthy();
      expect(preset.city).toBeTruthy();
      expect(preset.profile).toBeDefined();
      expect(preset.profile.city).toBe(preset.city);
      expect(typeof preset.profile.hasAirPurifier).toBe('boolean');
      expect(typeof preset.profile.hasKids).toBe('boolean');
      expect(typeof preset.profile.hasSenior).toBe('boolean');
      expect(typeof preset.profile.hasRespiratoryIssues).toBe('boolean');
    }
  });

  it('includes key Indian urban hubs in registry', () => {
    expect(INDIAN_CITIES).toContain('Delhi');
    expect(INDIAN_CITIES).toContain('Mumbai');
    expect(INDIAN_CITIES).toContain('Bengaluru');
    expect(INDIAN_CITIES).toContain('Kolkata');
    expect(INDIAN_CITIES).toContain('Kota');
    expect(INDIAN_CITIES.length).toBeGreaterThan(20);
  });
});
