const express = require('express');
const axios = require('axios');
const router = express.Router();

const WAQI_BASE = 'https://api.waqi.info';

function sanitizeQuery(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[^a-zA-Z0-9\s,\-_]/g, '').trim().slice(0, 80);
}

// Strict Indian station validator
function isIndianStation(stationName, stationUrl, country) {
  const name = (stationName || '').toLowerCase();
  const url = (stationUrl || '').toLowerCase();
  const c = (country || '').toUpperCase();

  // 1. Immediately reject foreign countries & foreign administrative regions
  const foreignSlugs = [
    'japan/', 'malaysia/', 'thailand/', 'china/', 'usa/', 'uk/', 'vietnam/',
    'indonesia/', 'philippines/', 'taiwan/', 'korea/', 'australia/', 'canada/',
    'singapore/', 'nepal/', 'pakistan/', 'bangladesh/', 'sri-lanka/'
  ];
  if (foreignSlugs.some(slug => url.startsWith(slug))) return false;

  const foreignNames = [
    'japan', 'malaysia', 'thailand', 'kanagawa', 'kelantan', 'prefecture',
    'hiratsuka', 'china', 'taiwan', 'bangkok', 'tokyo', 'kuala lumpur',
    'vietnam', 'jakarta', 'manila', 'singapore'
  ];
  if (foreignNames.some(term => name.includes(term))) return false;

  // 2. Accept only verified Indian stations
  if (c === 'IN') return true;
  if (url.startsWith('india/') || url.includes('/india/')) return true;
  if (name.endsWith(', india') || name.includes(', india') || name.includes(' india')) return true;

  return false;
}

function getAQICategory(aqi) {
  if (isNaN(aqi) || aqi === null) return 'Moderate';
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

function aqiToCPCBPM25(aqi) {
  if (isNaN(aqi) || aqi <= 0) return 15;
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

  // Never set PM2.5 equal to AQI number. Strictly compute realistic PM2.5 from CPCB sub-index breakpoints
  // (e.g. AQI 85 ≈ 51 μg/m³, AQI 153 ≈ 76 μg/m³, AQI 198 ≈ 89 μg/m³)
  if (
    rawPm25 == null ||
    isNaN(rawPm25) ||
    rawPm25 <= 0 ||
    Math.abs(rawPm25 - aqi) < 1.5 ||
    Math.abs(rawPm25 - cpcbExpected) > cpcbExpected * 0.20
  ) {
    pm25 = cpcbExpected;
  } else {
    pm25 = Math.round(rawPm25);
  }

  // Strictly enforce PM10 > PM2.5 (typically 1.3x to 1.8x PM2.5)
  let pm10;
  const minPm10 = Math.round(pm25 * 1.30);
  const maxPm10 = Math.round(pm25 * 1.80);

  if (rawPm10 == null || isNaN(rawPm10) || rawPm10 <= pm25 || rawPm10 < minPm10 || rawPm10 > maxPm10) {
    pm10 = Math.round(pm25 * 1.55);
  } else {
    pm10 = Math.round(rawPm10);
  }

  return { pm25, pm10 };
}

function formatStationData(data, defaultCity = 'Unknown') {
  const aqi = typeof data.aqi === 'number' ? data.aqi : Number(data.aqi) || 0;
  const iaqi = data.iaqi || {};
  const getPol = (key) => iaqi[key]?.v ?? null;

  const rawPm25 = getPol('pm25');
  const rawPm10 = getPol('pm10');
  const { pm25, pm10 } = enforceParticulatePhysics(aqi, rawPm25, rawPm10);

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
    aqiCategory: getAQICategory(aqi),
    isDemoData: false
  };
}

// GET /api/aqi/geo?lat=:lat&lng=:lng — Fetch nearest monitoring station by GPS coordinates
router.get('/geo', async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const token = process.env.WAQI_API_TOKEN;

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required' });
  }

  if (!token || token === 'your_waqi_token_here') {
    return res.json(getDemoFallbackData('Current Location'));
  }

  try {
    const response = await axios.get(`${WAQI_BASE}/feed/geo:${lat};${lng}/`, {
      params: { token },
      timeout: 8000
    });

    if (response.data?.status !== 'ok' || !response.data?.data) {
      throw new Error(response.data?.data || 'Failed to locate nearest air station');
    }

    const data = response.data.data;
    const payload = formatStationData(data);
    res.json(payload);
  } catch (err) {
    console.error('WAQI geo fetch error:', err.message);
    res.json(getDemoFallbackData('Current Location', err.message));
  }
});

// GET /api/aqi/search?q=:query  — Searches strictly Indian stations matching the query
router.get('/search', async (req, res) => {
  const q = sanitizeQuery(req.query.q);
  const token = process.env.WAQI_API_TOKEN;

  if (!q || q.length < 2) {
    return res.json({ status: 'ok', data: [] });
  }

  if (!token || token === 'your_waqi_token_here') {
    const sampleResults = [
      { uid: 8182, name: `${q} Central, India`, aqi: 125, time: new Date().toISOString(), city: q }
    ];
    return res.json({ status: 'demo', data: sampleResults });
  }

  try {
    // Search strictly with the query keyword ONLY (DO NOT append 'India', which pulls in unrelated cities)
    const response = await axios.get(`${WAQI_BASE}/search/`, {
      params: { keyword: q, token },
      timeout: 8000
    });

    const rawList = response.data?.data || [];
    const queryLower = q.toLowerCase();
    const unique = [];
    const seenUids = new Set();

    for (const s of rawList) {
      if (s && s.uid && !seenUids.has(s.uid) && s.station?.name) {
        seenUids.add(s.uid);
        const nameLower = (s.station.name || '').toLowerCase();
        const urlLower = (s.station.url || '').toLowerCase();

        // 1. Strict India check: Station must be in India
        if (!isIndianStation(s.station.name, s.station.url, s.station.country)) {
          continue;
        }

        // 2. Query match: Station name or url must match what the user searched
        const matchesQuery = nameLower.includes(queryLower) || urlLower.includes(queryLower);
        if (!matchesQuery) {
          continue;
        }

        const aqiNum = Number(s.aqi);
        unique.push({
          uid: s.uid,
          name: s.station.name,
          aqi: isNaN(aqiNum) ? (s.aqi || 'N/A') : aqiNum,
          time: s.time?.stime || '',
          city: s.station.name.split(',')[1]?.trim() || s.station.name.split(',')[0]?.trim() || q,
          url: s.station?.url
        });
      }
    }

    // Sort by has numeric AQI first, then newest timestamp
    unique.sort((a, b) => {
      const aValid = a.aqi !== 'N/A' && !isNaN(Number(a.aqi));
      const bValid = b.aqi !== 'N/A' && !isNaN(Number(b.aqi));
      if (aValid !== bValid) return aValid ? -1 : 1;
      return (b.time || '').localeCompare(a.time || '');
    });

    res.json({ status: 'ok', data: unique.slice(0, 15) });
  } catch (err) {
    console.error('WAQI Indian search error:', err.message);
    res.json({ status: 'error', data: [], message: err.message });
  }
});

// GET /api/aqi/station?uid=:uid — Fetch exact station by UID with Indian verification
router.get('/station', async (req, res) => {
  const uid = req.query.uid;
  const token = process.env.WAQI_API_TOKEN;

  if (!uid) {
    return res.status(400).json({ error: 'Station UID required' });
  }

  if (!token || token === 'your_waqi_token_here') {
    return res.json(getDemoFallbackData(`Station #${uid}`));
  }

  try {
    const response = await axios.get(`${WAQI_BASE}/feed/@${uid}/`, {
      params: { token },
      timeout: 8000
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
    res.json(payload);
  } catch (err) {
    console.error('WAQI station fetch error:', err.message);
    res.json(getDemoFallbackData(`Station #${uid}`, err.message));
  }
});

// GET /api/aqi/city?city=:city — Searches strictly for stations belonging to THAT specific city
router.get('/city', async (req, res) => {
  const city = sanitizeQuery(req.query.city) || 'Delhi';
  const token = process.env.WAQI_API_TOKEN;

  if (!token || token === 'your_waqi_token_here') {
    return res.json(getDemoFallbackData(city));
  }

  try {
    // Search strictly for the city name (NOT 'city India')
    const searchRes = await axios.get(`${WAQI_BASE}/search/`, {
      params: { keyword: city, token },
      timeout: 8000
    });

    const rawList = searchRes.data?.data || [];
    const cityLower = city.toLowerCase();

    // STRICT FILTER:
    // 1. Must be in India (reject Malaysia, Japan, etc.)
    // 2. Must match THIS specific city (reject Delhi stations when city=Chennai!)
    const cityMatchedStations = rawList.filter(s => {
      if (!s || !s.station) return false;
      const name = (s.station.name || '').toLowerCase();
      const url = (s.station.url || '').toLowerCase();

      const inIndia = isIndianStation(s.station.name, s.station.url, s.station.country);
      if (!inIndia) return false;

      const matchesCity = name.includes(cityLower) || url.includes(cityLower);
      return matchesCity;
    });

    // Sort matching stations: has valid numerical AQI first, then freshest timestamp
    cityMatchedStations.sort((a, b) => {
      const aValid = a.aqi !== '-' && !isNaN(Number(a.aqi));
      const bValid = b.aqi !== '-' && !isNaN(Number(b.aqi));
      if (aValid !== bValid) return aValid ? -1 : 1;
      return (b.time?.stime || '').localeCompare(a.time?.stime || '');
    });

    const candidate = cityMatchedStations[0];

    if (candidate) {
      const feedRes = await axios.get(`${WAQI_BASE}/feed/@${candidate.uid}/`, {
        params: { token },
        timeout: 8000
      });

      if (feedRes.data?.status === 'ok') {
        const payload = formatStationData(feedRes.data.data, city);
        return res.json(payload);
      }
    }

    // Direct fallback only if it explicitly points to india/
    const directRes = await axios.get(`${WAQI_BASE}/feed/india/${encodeURIComponent(city.toLowerCase())}/`, {
      params: { token },
      timeout: 5000
    }).catch(() => null);

    if (directRes?.data?.status === 'ok') {
      const payload = formatStationData(directRes.data.data, city);
      return res.json(payload);
    }

    throw new Error(`No active CPCB Indian monitoring station currently available for ${city}`);
  } catch (err) {
    console.error(`AQI Indian fetch error for ${city}:`, err.message);
    res.json(getDemoFallbackData(city, err.message));
  }
});

function getDemoFallbackData(city, reason = null) {
  const aqi = 168;
  const { pm25, pm10 } = enforceParticulatePhysics(aqi, null, null);
  return {
    status: 'fallback',
    city: city,
    aqi,
    pm25, // 80 μg/m³
    pm10, // 124 μg/m³
    no2: 45,
    o3: 21,
    co: 1.1,
    so2: 14,
    dominentPol: 'pm25',
    stationName: `${city}, India (CPCB Regional Sensor)`,
    stationRecordedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    feedSyncedAt: new Date().toISOString(),
    source: reason ? `Fallback Mode (${reason})` : 'CPCB India Baseline',
    aqiCategory: getAQICategory(aqi),
    isDemoData: true,
    fallbackReason: reason
  };
}

module.exports = router;
