import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAQI, fetchStationByUid, fetchAQIByGeo, searchStations } from './aqiService';
import { fetchGuidance, sendChatMessage, generateAdvisory } from './geminiService';
import type { UserProfile, AQIData } from '../types';

const profile: UserProfile = {
  city: 'Delhi',
  hasKids: true,
  hasSenior: false,
  hasRespiratoryIssues: false,
  commuteMode: 'Metro',
  hasAirPurifier: true,
};

const aqiData: AQIData = {
  status: 'live',
  city: 'Delhi',
  aqi: 150,
  pm25: 75,
  pm10: 116,
  no2: 40,
  o3: 18,
  co: 1.0,
  so2: 10,
  dominentPol: 'pm25',
  stationName: 'Lodhi Road',
  lastUpdated: '2026-11-26T12:00:00Z',
  source: 'CPCB',
  aqiCategory: 'Moderate',
  isDemoData: false,
};

describe('Frontend API Services', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('fetchAQI sanitizes particulate physics when WAQI returns pm25 equal to aqi', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...aqiData, aqi: 153, pm25: 153, pm10: 50 }),
    });

    const result = await fetchAQI('Delhi');
    expect(fetchMock).toHaveBeenCalledWith('/api/aqi/city?city=Delhi', { signal: undefined });
    expect(result.pm25).toBe(76);
    expect(result.pm10).toBeGreaterThan(result.pm25!);
  });

  it('fetchStationByUid and fetchAQIByGeo throw on non-ok responses', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });
    await expect(fetchStationByUid(999)).rejects.toThrow('Station fetch error: 400');

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(fetchAQIByGeo(28.6, 77.2)).rejects.toThrow('Geo AQI error: 500');
  });

  it('searchStations skips requests shorter than 2 characters and returns [] on HTTP error', async () => {
    expect(await searchStations('a')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    expect(await searchStations('delhi')).toEqual([]);
  });

  it('geminiService functions return structured responses and throw on non-ok status', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok', data: {}, source: 'Local' }),
    });
    const guidance = await fetchGuidance(profile, aqiData);
    expect(guidance.status).toBe('ok');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: 'Wear N95', suggestedFollowUps: ['Q1'] }),
    });
    const chat = await sendChatMessage('Hello', profile, aqiData);
    expect(chat).toEqual({ reply: 'Wear N95', followUps: ['Q1'] });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ advisory: '*Bulletin*' }),
    });
    expect(await generateAdvisory(profile, aqiData, 'rwa', 'en')).toBe('*Bulletin*');

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
    await expect(generateAdvisory(profile, aqiData)).rejects.toThrow('Advisory error');
  });
});
