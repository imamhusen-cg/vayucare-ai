import type { AQIData, StationSearchResult } from '../types';
import { enforceParticulatePhysics } from '../utils/aqi';

function sanitizeAQIPayload(data: AQIData): AQIData {
  if (!data) return data;
  const aqi = typeof data.aqi === 'number' ? data.aqi : Number(data.aqi) || 0;
  const { pm25, pm10 } = enforceParticulatePhysics(aqi, data.pm25, data.pm10);
  return {
    ...data,
    aqi,
    pm25,
    pm10,
  };
}

export async function fetchAQI(city: string, signal?: AbortSignal): Promise<AQIData> {
  const response = await fetch(`/api/aqi/city?city=${encodeURIComponent(city)}`, { signal });
  if (!response.ok) throw new Error(`AQI API error: ${response.status}`);
  const json = await response.json();
  return sanitizeAQIPayload(json);
}

export async function fetchStationByUid(uid: number, signal?: AbortSignal): Promise<AQIData> {
  const response = await fetch(`/api/aqi/station?uid=${uid}`, { signal });
  if (!response.ok) throw new Error(`Station fetch error: ${response.status}`);
  const json = await response.json();
  return sanitizeAQIPayload(json);
}

export async function fetchAQIByGeo(lat: number, lng: number, signal?: AbortSignal): Promise<AQIData> {
  const response = await fetch(`/api/aqi/geo?lat=${lat}&lng=${lng}`, { signal });
  if (!response.ok) throw new Error(`Geo AQI error: ${response.status}`);
  const json = await response.json();
  return sanitizeAQIPayload(json);
}

export async function searchStations(query: string, signal?: AbortSignal): Promise<StationSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  const response = await fetch(`/api/aqi/search?q=${encodeURIComponent(query.trim())}`, { signal });
  if (!response.ok) return [];
  const res = await response.json();
  return res.data || [];
}
