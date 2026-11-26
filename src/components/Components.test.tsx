import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { AppProvider } from '../context/AppContext';
import { PresetBanner } from './PresetBanner';
import { IndoorTab } from './tabs/IndoorTab';
import { AQIDashboard } from './AQIDashboard';
import { AdvisoryModal } from './AdvisoryModal';
import * as aqiService from '../services/aqiService';
import * as geminiService from '../services/geminiService';
import type { AQIData, GuidanceResponse } from '../types';

vi.mock('../services/aqiService');
vi.mock('../services/geminiService');

const mockAQI: AQIData = {
  status: 'live',
  city: 'Delhi',
  aqi: 245,
  pm25: 104,
  pm10: 161,
  no2: 48,
  o3: 22,
  co: 1.2,
  so2: 14,
  dominentPol: 'pm25',
  stationName: 'Anand Vihar, Delhi',
  lastUpdated: new Date().toISOString(),
  source: 'CPCB',
  aqiCategory: 'Poor',
  isDemoData: false,
};

function makeGuidance(windowStrategy: string): GuidanceResponse {
  return {
    status: 'ok',
    source: 'CPCB Rules',
    data: {
      summary: { alertLevel: 'poor', headline: 'Poor air quality', mainRisk: 'High PM2.5' },
      routinePlanner: {
        morning: { timeWindow: '6-9 AM', recommendation: 'Stay indoors. Wear N95.', actions: [], maskRequired: true, outdoorSafe: false },
        afternoon: { timeWindow: '12-4 PM', recommendation: 'Short errands only. Mask up.', actions: [], maskRequired: true, outdoorSafe: false },
        evening: { timeWindow: '5-9 PM', recommendation: 'Keep sealed. Run purifier.', actions: [], maskRequired: true, outdoorSafe: false },
        commuteAdvice: 'Use enclosed transit.',
        errandBundling: 'Bundle midday.',
      },
      indoorAQ: {
        windowStrategy,
        purifierAdvice: 'Run HEPA purifier continuously in bedrooms and keep exterior doors sealed.',
        zeroCostTips: ['Wet mop floors twice daily'],
        kitchenTips: ['Run chimney before cooking'],
        plantSuggestions: ['Snake Plant (Formaldehyde filter)'],
      },
      sustainableAlternatives: [],
      vulnerableGroupAlerts: { children: null, seniors: null, respiratory: null },
    },
  };
}

describe('Core UI Components', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(aqiService.fetchAQI).mockResolvedValue(mockAQI);
    vi.mocked(geminiService.fetchGuidance).mockResolvedValue(
      makeGuidance('Do not open windows during severe smog episodes today. Seal all gaps.')
    );
    vi.mocked(geminiService.generateAdvisory).mockRejectedValue(new Error('offline'));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('PresetBanner highlights preset only when full profile matches', async () => {
    render(
      <AppProvider>
        <PresetBanner />
      </AppProvider>
    );

    const kolkataBtn = screen.getByText('Kolkata outdoor cyclist').closest('button')!;
    expect(kolkataBtn.className).not.toContain('bg-accent/15');

    fireEvent.click(kolkataBtn);
    await waitFor(() => {
      expect(kolkataBtn.className).toContain('bg-accent/15');
    });
  });

  it('IndoorTab does not misclassify negative window phrasing as ventilation permitted', async () => {
    render(
      <AppProvider>
        <IndoorTab />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Keep Windows Sealed')).toBeTruthy();
    });
  });

  it('AQIDashboard renders telemetry and switches to Nearby Stations view', async () => {
    render(
      <AppProvider>
        <AQIDashboard />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Anand Vihar, Delhi')).toBeTruthy();
      expect(screen.getAllByText('Poor').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Nearby Stations'));
    expect(screen.getByText('Airshed Radar Map')).toBeTruthy();
  });

  it('AdvisoryModal loads fallback bulletin, switches to Hindi, and closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <AppProvider>
        <AdvisoryModal isOpen={true} onClose={onClose} />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/VayuCare Neighborhood RWA Advisory/i)).toBeTruthy();
    });

    fireEvent.click(screen.getByText('हिन्दी'));
    await waitFor(() => {
      expect(screen.getByText(/वायुकेयर आरडब्ल्यूए/i)).toBeTruthy();
    });

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
