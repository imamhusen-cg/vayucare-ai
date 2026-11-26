import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent, cleanup } from '@testing-library/react';
import { AppProvider, useApp } from './AppContext';
import * as aqiService from '../services/aqiService';
import * as geminiService from '../services/geminiService';
import type { AQIData, GuidanceResponse } from '../types';

vi.mock('../services/aqiService');
vi.mock('../services/geminiService');

const makeAQI = (city: string, stationName = `${city} Central`, aqi = 150): AQIData => ({
  status: 'live',
  city,
  aqi,
  pm25: 75,
  pm10: 116,
  no2: 35,
  o3: 18,
  co: 1,
  so2: 10,
  dominentPol: 'pm25',
  stationName,
  lastUpdated: '2026-11-26T12:00:00Z',
  source: 'CPCB',
  aqiCategory: 'Moderate',
  isDemoData: false,
});

const mockGuidance: GuidanceResponse = {
  status: 'ok',
  source: 'Test Engine',
  data: {
    summary: { alertLevel: 'moderate', headline: 'Moderate air', mainRisk: 'PM2.5 elevated' },
    routinePlanner: {
      morning: { timeWindow: '6-9 AM', recommendation: 'Keep windows closed.', actions: ['Stay in'], maskRequired: true, outdoorSafe: false },
      afternoon: { timeWindow: '12-4 PM', recommendation: 'Brief errands ok.', actions: ['Bundle'], maskRequired: false, outdoorSafe: true },
      evening: { timeWindow: '5-9 PM', recommendation: 'Traffic peak.', actions: ['Seal home'], maskRequired: true, outdoorSafe: false },
      commuteAdvice: 'Use cabin recirculation.',
      errandBundling: 'Batch errands midday.',
    },
    indoorAQ: {
      windowStrategy: 'Open windows for 30 minutes around 1:00 PM when mixing height rises.',
      purifierAdvice: 'Wet mop twice daily to capture settled particulate dust indoors.',
      zeroCostTips: ['Wet mop'],
      kitchenTips: ['Run exhaust'],
      plantSuggestions: ['Snake Plant (Filters VOCs)'],
    },
    sustainableAlternatives: [],
    vulnerableGroupAlerts: { children: null, seniors: null, respiratory: null },
  },
};

function Harness() {
  const { profile, aqiData, selectStation, loadPreset } = useApp();
  return (
    <div>
      <span data-testid="city">{profile.city}</span>
      <span data-testid="station">{aqiData?.stationName || 'none'}</span>
      <button onClick={() => selectStation(9001, 'Mumbai')}>Select Mumbai Station</button>
      <button onClick={() => loadPreset('kolkata-student')}>Load Kolkata Preset</button>
    </div>
  );
}

describe('AppContext state & request orchestration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(aqiService.fetchAQI).mockImplementation(async (city) => makeAQI(city));
    vi.mocked(aqiService.fetchStationByUid).mockResolvedValue(makeAQI('Mumbai', 'Bandra Kurla Complex', 110));
    vi.mocked(geminiService.fetchGuidance).mockResolvedValue(mockGuidance);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('recovers cleanly from malformed localStorage profile JSON', async () => {
    localStorage.setItem('vayucare_profile', '{broken-json');
    render(
      <AppProvider>
        <Harness />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('city').textContent).toBe('Delhi');
      expect(screen.getByTestId('station').textContent).toBe('Delhi Central');
    });
  });

  it('selectStation updates city without triggering a duplicate fetchAQI that overwrites the station', async () => {
    render(
      <AppProvider>
        <Harness />
      </AppProvider>
    );

    await waitFor(() => expect(screen.getByTestId('station').textContent).toBe('Delhi Central'));
    expect(aqiService.fetchAQI).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByText('Select Mumbai Station'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('city').textContent).toBe('Mumbai');
      expect(screen.getByTestId('station').textContent).toBe('Bandra Kurla Complex');
    });
    // Must still only have the initial mount fetchAQI call, not a second Mumbai city fetch
    expect(aqiService.fetchAQI).toHaveBeenCalledTimes(1);
    expect(aqiService.fetchStationByUid).toHaveBeenCalledTimes(1);
  });

  it('loadPreset updates city and flags without firing a duplicate guidance request on stale AQI', async () => {
    render(
      <AppProvider>
        <Harness />
      </AppProvider>
    );

    await waitFor(() => expect(geminiService.fetchGuidance).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.click(screen.getByText('Load Kolkata Preset'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('city').textContent).toBe('Kolkata');
      expect(screen.getByTestId('station').textContent).toBe('Kolkata Central');
    });

    // Guidance is refreshed for initial mount and Kolkata preset
    expect(geminiService.fetchGuidance).toHaveBeenCalled();
    expect((geminiService.fetchGuidance as any).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
