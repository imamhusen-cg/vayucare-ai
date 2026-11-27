const express = require('express');
const axios = require('axios');
const {
  getCPCBScaleCategory,
  enforceParticulatePhysics,
  BoundedTTLCache,
} = require('../utils/cpcb');

const router = express.Router();

const WAQI_BASE = 'https://api.waqi.info';
const waqiClient = axios.create({
  baseURL: WAQI_BASE,
  timeout: 8000,
});

// Cache live WAQI station & search responses for 3 minutes (CPCB updates hourly)
const aqiCache = new BoundedTTLCache(120, 3 * 60 * 1000);

const FOREIGN_SLUGS = [
  'japan/', 'malaysia/', 'thailand/', 'china/', 'usa/', 'uk/', 'vietnam/',
  'indonesia/', 'philippines/', 'taiwan/', 'korea/', 'australia/', 'canada/',
  'singapore/', 'nepal/', 'pakistan/', 'bangladesh/', 'sri-lanka/'
];

const FOREIGN_NAMES = [
  'japan', 'malaysia', 'thailand', 'kanagawa', 'kelantan', 'prefecture',
  'hiratsuka', 'china', 'taiwan', 'bangkok', 'tokyo', 'kuala lumpur',
  'vietnam', 'jakarta', 'manila', 'singapore'
];

function sanitizeQuery(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9\s,\-_]/g, '').trim().slice(0, 80);
}

function isValidToken(token) {
  return Boolean(token && token !== 'your_waqi_token_here');
}

// Strict Indian station validator
function isIndianStation(stationName, stationUrl, country) {
  const name = (stationName || '').toLowerCase();
  const url = (stationUrl || '').toLowerCase();
  const c = (country || '').toUpperCase();

  if (FOREIGN_SLUGS.some(slug => url.startsWith(slug))) return false;
  if (FOREIGN_NAMES.some(term => name.includes(term))) return false;

  if (c === 'IN') return true;
  if (url.startsWith('india/') || url.includes('/india/')) return true;
  if (name.endsWith(', india') || name.includes(', india') || name.includes(' india')) return true;

  return false;
}

function formatStationData(data, defaultCity = 'Unknown') {
  const aqi = typeof data.aqi === 'number' ? data.aqi : Number(data.aqi) || 0;
  const iaqi = data.iaqi || {};
  const getPol = (key) => iaqi[key]?.v ?? null;

  const { pm25, pm10, pm25Estimated, pm10Estimated } = enforceParticulatePhysics(
    aqi,
    getPol('pm25'),
    getPol('pm10')
  );

  let cityName = defaultCity;
  let stationName = defaultCity;

  if (data.city) {
    if (typeof data.city === 'object') {
      stationName = data.city.name || defaultCity;
      const parts = stationName.split(',');
      if (parts.length > 1) {
        cityName = parts[parts.length - 2]?.trim() || defaultCity;
      }
    } else {
      stationName = data.city;
      cityName = data.city;
    }
  }

  const stationTime = data.time?.iso || data.time?.s || new Date().toISOString();

  return {
    status: 'live',
    city: cityName,
    aqi,
    pm25,
    pm10,
    pm25Estimated,
    pm10Estimated,
    stationUid: typeof data.idx === 'number' ? data.idx : undefined,
    no2: getPol('no2'),
    o3: getPol('o3'),
    co: getPol('co'),
    so2: getPol('so2'),
    dominentPol: data.dominentpol || 'pm25',
    stationName,
    stationRecordedAt: stationTime,
    lastUpdated: stationTime,
    feedSyncedAt: new Date().toISOString(),
    source: 'CPCB / State Pollution Control Board (India)',
    aqiCategory: getCPCBScaleCategory(aqi),
    isDemoData: false,
  };
}

function getDemoFallbackData(city, reason = null) {
  const aqi = 168;
  const { pm25, pm10 } = enforceParticulatePhysics(aqi, null, null);
  const now = new Date().toISOString();
  return {
    status: 'fallback',
    city,
    aqi,
    pm25,
    pm10,
    pm25Estimated: true,
    pm10Estimated: true,
    no2: 45,
    o3: 21,
    co: 1.1,
    so2: 14,
    dominentPol: 'pm25',
    stationName: `${city}, India (CPCB Regional Sensor)`,
    stationRecordedAt: now,
    lastUpdated: now,
    feedSyncedAt: now,
    source: reason ? `Fallback Mode (${reason})` : 'CPCB India Baseline',
    aqiCategory: getCPCBScaleCategory(aqi),
    isDemoData: true,
    fallbackReason: reason,
  };
}

// GET /api/aqi/geo?lat=:lat&lng=:lng — Fetch nearest monitoring station by GPS coordinates
router.get('/geo', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const token = process.env.WAQI_API_TOKEN;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return res.status(400).json({ error: 'Valid latitude (-90..90) and longitude (-180..180) are required' });
  }

  if (!isValidToken(token)) {
    return res.json(getDemoFallbackData('Current Location'));
  }

  const cacheKey = `geo:${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = aqiCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await waqiClient.get(`/feed/geo:${lat};${lng}/`, {
      params: { token },
    });

    if (response.data?.status !== 'ok' || !response.data?.data) {
      throw new Error(response.data?.data || 'Failed to locate nearest air station');
    }

    const payload = formatStationData(response.data.data);
    aqiCache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('WAQI geo fetch error:', err.message);
    res.json(getDemoFallbackData('Current Location', err.message));
  }
});

// GET /api/aqi/search?q=:query — Searches strictly Indian stations matching the query
router.get('/search', async (req, res) => {
  const q = sanitizeQuery(req.query.q);
  const token = process.env.WAQI_API_TOKEN;

  if (!q || q.length < 2) {
    return res.json({ status: 'ok', data: [] });
  }

  if (!isValidToken(token)) {
    const sampleResults = [
      { uid: 8182, name: `${q} Central, India`, aqi: 125, time: new Date().toISOString(), city: q }
    ];
    return res.json({ status: 'demo', data: sampleResults });
  }

  const queryLower = q.toLowerCase();
  const cacheKey = `search:${queryLower}`;
  const cached = aqiCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // Search strictly with the query keyword ONLY (DO NOT append 'India', which pulls in unrelated cities)
    const response = await waqiClient.get('/search/', {
      params: { keyword: q, token },
    });

    const rawList = response.data?.data || [];
    const unique = [];
    const seenUids = new Set();

    for (const s of rawList) {
      if (!s || !s.uid || seenUids.has(s.uid) || !s.station?.name) continue;
      seenUids.add(s.uid);

      const nameLower = s.station.name.toLowerCase();
      const urlLower = (s.station.url || '').toLowerCase();

      if (!isIndianStation(s.station.name, s.station.url, s.station.country)) {
        continue;
      }

      if (!nameLower.includes(queryLower) && !urlLower.includes(queryLower)) {
        continue;
      }

      const aqiNum = Number(s.aqi);
      unique.push({
        uid: s.uid,
        name: s.station.name,
        aqi: Number.isNaN(aqiNum) ? (s.aqi || 'N/A') : aqiNum,
        time: s.time?.stime || '',
        city: s.station.name.split(',')[1]?.trim() || s.station.name.split(',')[0]?.trim() || q,
        url: s.station?.url,
      });
    }

    unique.sort((a, b) => {
      const aValid = a.aqi !== 'N/A' && !Number.isNaN(Number(a.aqi));
      const bValid = b.aqi !== 'N/A' && !Number.isNaN(Number(b.aqi));
      if (aValid !== bValid) return aValid ? -1 : 1;
      return (b.time || '').localeCompare(a.time || '');
    });

    const payload = { status: 'ok', data: unique.slice(0, 15) };
    aqiCache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('WAQI Indian search error:', err.message);
    res.json({ status: 'error', data: [], message: err.message });
  }
});

// GET /api/aqi/station?uid=:uid — Fetch exact station by UID with Indian verification
router.get('/station', async (req, res) => {
  const rawUid = typeof req.query.uid === 'string' ? req.query.uid.trim() : '';
  const token = process.env.WAQI_API_TOKEN;

  if (!/^\d+$/.test(rawUid)) {
    return res.status(400).json({ error: 'Valid numeric station UID is required' });
  }

  if (!isValidToken(token)) {
    return res.json(getDemoFallbackData(`Station #${rawUid}`));
  }

  const cacheKey = `station:${rawUid}`;
  const cached = aqiCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await waqiClient.get(`/feed/@${rawUid}/`, {
      params: { token },
    });

    if (response.data?.status !== 'ok') {
      throw new Error(response.data?.data || 'Station feed error');
    }

    const data = response.data.data;
    const stName = typeof data.city === 'object' ? data.city?.name : data.city;
    const stUrl = typeof data.city === 'object' ? data.city?.url : '';
    if (!isIndianStation(stName, stUrl, 'IN')) {
      throw new Error('Selected station is not located in India');
    }

    const payload = formatStationData(data);
    aqiCache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('WAQI station fetch error:', err.message);
    res.json(getDemoFallbackData(`Station #${rawUid}`, err.message));
  }
});

// GET /api/aqi/city?city=:city — Searches strictly for stations belonging to THAT specific city
router.get('/city', async (req, res) => {
  const city = sanitizeQuery(req.query.city) || 'Delhi';
  const token = process.env.WAQI_API_TOKEN;

  if (!isValidToken(token)) {
    return res.json(getDemoFallbackData(city));
  }

  const cityLower = city.toLowerCase();
  const cacheKey = `city:${cityLower}`;
  const cached = aqiCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const searchRes = await waqiClient.get('/search/', {
      params: { keyword: city, token },
    });

    const rawList = searchRes.data?.data || [];
    const cityMatchedStations = rawList.filter(s => {
      if (!s || !s.station) return false;
      const name = (s.station.name || '').toLowerCase();
      const url = (s.station.url || '').toLowerCase();
      return isIndianStation(s.station.name, s.station.url, s.station.country) &&
        (name.includes(cityLower) || url.includes(cityLower));
    });

    cityMatchedStations.sort((a, b) => {
      const aValid = a.aqi !== '-' && !Number.isNaN(Number(a.aqi));
      const bValid = b.aqi !== '-' && !Number.isNaN(Number(b.aqi));
      if (aValid !== bValid) return aValid ? -1 : 1;
      return (b.time?.stime || '').localeCompare(a.time?.stime || '');
    });

    const candidate = cityMatchedStations[0];

    if (candidate) {
      const feedRes = await waqiClient.get(`/feed/@${candidate.uid}/`, {
        params: { token },
      });

      if (feedRes.data?.status === 'ok') {
        const payload = formatStationData(feedRes.data.data, city);
        aqiCache.set(cacheKey, payload);
        return res.json(payload);
      }
    }

    const directRes = await waqiClient.get(`/feed/india/${encodeURIComponent(cityLower)}/`, {
      params: { token },
      timeout: 5000,
    }).catch(() => null);

    if (directRes?.data?.status === 'ok') {
      const payload = formatStationData(directRes.data.data, city);
      aqiCache.set(cacheKey, payload);
      return res.json(payload);
    }

    throw new Error(`No active CPCB Indian monitoring station currently available for ${city}`);
  } catch (err) {
    console.error('AQI Indian fetch error for %s: %s', city, err.message);
    res.json(getDemoFallbackData(city, err.message));
  }
});

module.exports = router;
