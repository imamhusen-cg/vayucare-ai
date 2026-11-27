/**
 * Shared CPCB IND-AQI calculations, particulate physics enforcement,
 * metro-city registry, and bounded TTL in-memory cache.
 */

const METRO_CITIES = [
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

function getCPCBScaleCategory(aqi) {
  if (!Number.isFinite(aqi) || aqi === null) return 'Moderate';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

function aqiToCPCBPM25(aqi) {
  if (!Number.isFinite(aqi) || aqi <= 0) return 15;
  if (aqi <= 50) return Math.round(aqi * 0.6);
  if (aqi <= 100) return Math.round(30 + (aqi - 50) * 0.6);
  if (aqi <= 200) return Math.round(60 + (aqi - 100) * 0.3);
  if (aqi <= 300) return Math.round(90 + (aqi - 200) * 0.3);
  if (aqi <= 400) return Math.round(120 + (aqi - 300) * 1.3);
  return Math.round(250 + (aqi - 400) * 1.3);
}

function enforceParticulatePhysics(aqi, rawPm25, rawPm10) {
  const cpcbExpected = aqiToCPCBPM25(aqi);
  let pm25;
  let pm25Estimated = false;

  // Preserve actual reported sensor PM2.5; only estimate from CPCB breakpoints when unreported
  if (rawPm25 == null || !Number.isFinite(rawPm25) || rawPm25 <= 0) {
    pm25 = cpcbExpected;
    pm25Estimated = true;
  } else {
    pm25 = Math.round(rawPm25);
  }

  // Preserve actual reported sensor PM10; only estimate when unreported
  let pm10;
  let pm10Estimated = false;
  if (rawPm10 == null || !Number.isFinite(rawPm10) || rawPm10 <= 0) {
    pm10 = Math.round(pm25 * 1.55);
    pm10Estimated = true;
  } else {
    pm10 = Math.round(rawPm10);
  }

  return { pm25, pm10, pm25Estimated, pm10Estimated };
}

function isMetroCity(cityName) {
  if (!cityName || typeof cityName !== 'string') return false;
  const name = cityName.toLowerCase().trim();
  if (!name) return false;
  return METRO_CITIES.some(m => name.includes(m) || m.includes(name));
}

/**
 * Simple bounded in-memory LRU/TTL cache to avoid redundant external API calls
 * without unbounded memory growth.
 */
class BoundedTTLCache {
  constructor(maxEntries = 100, ttlMs = 180000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh insertion order for LRU eviction
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear() {
    this.store.clear();
  }
}

module.exports = {
  METRO_CITIES,
  getCPCBScaleCategory,
  aqiToCPCBPM25,
  enforceParticulatePhysics,
  isMetroCity,
  BoundedTTLCache,
};
