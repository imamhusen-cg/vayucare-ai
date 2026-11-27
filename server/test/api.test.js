const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index');
const {
  getCPCBScaleCategory,
  aqiToCPCBPM25,
  enforceParticulatePhysics,
  isMetroCity,
  BoundedTTLCache,
} = require('../utils/cpcb');
const { getDynamicAdvisory } = require('../utils/advisories');

describe('Server CPCB Utilities & Cache', () => {
  test('BoundedTTLCache stores, refreshes LRU order, evicts oldest, and expires by TTL', async () => {
    const cache = new BoundedTTLCache(2, 60);
    cache.set('a', 1);
    cache.set('b', 2);
    assert.equal(cache.get('a'), 1); // refreshes 'a'
    cache.set('c', 3); // should evict 'b'
    assert.equal(cache.get('b'), undefined);
    assert.equal(cache.get('a'), 1);
    assert.equal(cache.get('c'), 3);

    await new Promise((r) => setTimeout(r, 80));
    assert.equal(cache.get('a'), undefined);
  });

  test('enforceParticulatePhysics enforces PM10 > PM2.5 and valid CPCB PM2.5', () => {
    const res = enforceParticulatePhysics(168, null, null);
    assert.equal(res.pm25, aqiToCPCBPM25(168));
    assert.ok(res.pm10 > res.pm25);
    assert.equal(getCPCBScaleCategory(168), 'Moderate');
    assert.equal(getCPCBScaleCategory(NaN), 'Moderate');
    assert.equal(isMetroCity('Delhi'), true);
    assert.equal(isMetroCity('Kota'), false);
  });

  test('getDynamicAdvisory formats English and Hindi bulletins for all audiences', () => {
    const aqi = { city: 'Delhi', aqi: 240, pm25: 102, stationName: 'Anand Vihar' };
    for (const audience of ['rwa', 'family', 'school']) {
      const en = getDynamicAdvisory({}, aqi, audience, 'en');
      const hi = getDynamicAdvisory({}, aqi, audience, 'hi');
      assert.ok(en.includes('Delhi') && en.includes('240'));
      assert.ok(hi.includes('Delhi') && hi.includes('240'));
    }
  });
});

describe('VayuCare API Server Test Suite', () => {
  let server;
  let baseUrl;
  let origWaqi;
  let origGemini;

  before(async () => {
    origWaqi = process.env.WAQI_API_TOKEN;
    origGemini = process.env.GEMINI_API_KEY;
    // Use deterministic offline/fallback mode during automated API contract tests
    delete process.env.WAQI_API_TOKEN;
    delete process.env.GEMINI_API_KEY;

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (origWaqi !== undefined) process.env.WAQI_API_TOKEN = origWaqi;
    if (origGemini !== undefined) process.env.GEMINI_API_KEY = origGemini;
    await new Promise((resolve) => server.close(resolve));
  });

  test('GET /api/health responds with status ok and security headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.timestamp);
  });

  test('GET /api/aqi/city returns structured CPCB air telemetry', async () => {
    const res = await fetch(`${baseUrl}/api/aqi/city?city=Delhi`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.city, 'Delhi');
    assert.equal(typeof body.aqi, 'number');
    assert.equal(typeof body.pm25, 'number');
    assert.equal(typeof body.pm10, 'number');
    assert.ok(body.pm10 > body.pm25, 'Physical constraint: PM10 > PM2.5');
    assert.ok(body.aqiCategory);
  });

  test('GET /api/aqi/search returns station array and empty for short queries', async () => {
    const shortRes = await fetch(`${baseUrl}/api/aqi/search?q=d`);
    assert.equal(shortRes.status, 200);
    const shortBody = await shortRes.json();
    assert.deepEqual(shortBody.data, []);

    const res = await fetch(`${baseUrl}/api/aqi/search?q=delhi`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  test('GET /api/aqi/station validates numeric UID and returns fallback for valid UID', async () => {
    const badRes = await fetch(`${baseUrl}/api/aqi/station?uid=../etc`);
    assert.equal(badRes.status, 400);

    const okRes = await fetch(`${baseUrl}/api/aqi/station?uid=8182`);
    assert.equal(okRes.status, 200);
    const body = await okRes.json();
    assert.ok(body.stationName.includes('8182'));
  });

  test('GET /api/aqi/geo validates coordinate bounds and returns telemetry for valid coords', async () => {
    const badRes = await fetch(`${baseUrl}/api/aqi/geo?lat=190&lng=77`);
    assert.equal(badRes.status, 400);

    const nanRes = await fetch(`${baseUrl}/api/aqi/geo?lat=abc&lng=77`);
    assert.equal(nanRes.status, 400);

    const okRes = await fetch(`${baseUrl}/api/aqi/geo?lat=28.61&lng=77.20`);
    assert.equal(okRes.status, 200);
    const body = await okRes.json();
    assert.equal(typeof body.aqi, 'number');
  });

  test('POST /api/gemini/guidance returns full structured 3-tab guidance including low AQI=0', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/guidance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: { city: 'Kota', hasKids: true, commuteMode: 'Cycle', hasAirPurifier: false },
        aqiData: { city: 'Kota', aqi: 0, pm25: 10, pm10: 20 },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.data.summary.alertLevel, 'good');
    assert.ok(body.data.routinePlanner.morning.recommendation);
    assert.ok(body.data.indoorAQ.windowStrategy);
    assert.ok(Array.isArray(body.data.sustainableAlternatives));
    assert.ok(body.data.vulnerableGroupAlerts.children);
    assert.equal(body.data.vulnerableGroupAlerts.seniors, null);
  });

  test('POST /api/gemini/chat returns grounded reply, reasoningSteps, and 3 follow-ups', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Can kids play outside today?',
        profile: { city: 'Delhi', hasKids: true, commuteMode: 'Metro', hasAirPurifier: true },
        aqiData: { city: 'Delhi', aqi: 240, pm25: 102, pm10: 158 },
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.reply.includes('Delhi'));
    assert.ok(Array.isArray(body.reasoningSteps) && body.reasoningSteps.length > 0);
    assert.ok(Array.isArray(body.suggestedFollowUps) && body.suggestedFollowUps.length === 3);
  });

  test('POST /api/gemini/advisory returns Hindi & English community bulletins', async () => {
    const res = await fetch(`${baseUrl}/api/gemini/advisory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: { city: 'Mumbai' },
        aqiData: { city: 'Mumbai', aqi: 135, pm25: 71, stationName: 'BKC' },
        audience: 'school',
        language: 'hi',
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
    assert.ok(body.advisory.includes('Mumbai'));
    assert.ok(body.advisory.includes('विद्यालय'));
  });

  test('GET /api/unknown returns 404 not found error', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent-endpoint`);
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error, 'Not found');
  });
});
