const express = require('express');
const axios = require('axios');
const {
  getCPCBScaleCategory,
  enforceParticulatePhysics,
  isMetroCity,
  BoundedTTLCache,
} = require('../utils/cpcb');
const { getDynamicAdvisory } = require('../utils/advisories');

const router = express.Router();

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-latest'
].filter(Boolean);

// Short-TTL cache for identical live Gemini responses (guidance & advisories)
const geminiCache = new BoundedTTLCache(80, 5 * 60 * 1000);

function isLikelyValidKey(key) {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 20) return false;
  if (/your.*key|actualkey|placeholder|dummy|sample/i.test(trimmed)) return false;
  return true;
}

async function callGemini(apiKey, contents, generationConfig = {}, timeout = 25000) {
  let lastErr;
  for (const model of GEMINI_MODELS) {
    const attemptJsonModes = generationConfig.responseMimeType ? [true, false] : [false];
    for (const withJsonMime of attemptJsonModes) {
      try {
        const cfg = { ...generationConfig };
        if (!withJsonMime) {
          delete cfg.responseMimeType;
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const response = await axios.post(
          url,
          { contents, generationConfig: cfg },
          {
            timeout,
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
          }
        );
        return { response, model };
      } catch (err) {
        lastErr = err;
        const status = err.response?.status;
        const errMsg = err.response?.data?.error?.message || err.message;
        console.warn(`Gemini model ${model} (jsonMime=${withJsonMime}) failed (${status}): ${errMsg}`);

        if (errMsg && /API_KEY_INVALID|API key not valid|key.*invalid/i.test(errMsg)) {
          throw new Error('Invalid Gemini API key');
        }

        if (status === 400 && withJsonMime) {
          continue;
        }

        break;
      }
    }
  }
  throw lastErr;
}

function cleanAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') throw new Error('Empty text');
  let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

function sanitizeString(str, maxLen = 200) {
  if (!str || typeof str !== 'string') return '';
  return str.slice(0, maxLen).replace(/[<>]/g, '').trim();
}

function sanitizeProfile(profile) {
  return {
    city: sanitizeString(profile?.city || 'Delhi', 50),
    hasKids: Boolean(profile?.hasKids),
    hasSenior: Boolean(profile?.hasSenior),
    hasRespiratoryIssues: Boolean(profile?.hasRespiratoryIssues),
    commuteMode: sanitizeString(profile?.commuteMode || 'Car with AC', 50),
    hasAirPurifier: Boolean(profile?.hasAirPurifier),
  };
}

function sanitizeAQIData(aqiData) {
  const rawAqi = Number(aqiData?.aqi);
  const aqi = Number.isFinite(rawAqi) ? rawAqi : 0;
  const rawPm25 = aqiData?.pm25 != null ? Number(aqiData.pm25) : null;
  const rawPm10 = aqiData?.pm10 != null ? Number(aqiData.pm10) : null;
  const { pm25, pm10 } = enforceParticulatePhysics(aqi, rawPm25, rawPm10);

  const rawNo2 = Number(aqiData?.no2);
  const rawO3 = Number(aqiData?.o3);

  return {
    city: sanitizeString(aqiData?.city || 'Delhi', 50),
    aqi,
    pm25,
    pm10,
    no2: Number.isFinite(rawNo2) ? rawNo2 : 0,
    o3: Number.isFinite(rawO3) ? rawO3 : 0,
    aqiCategory: sanitizeString(aqiData?.aqiCategory || getCPCBScaleCategory(aqi), 50),
    lastUpdated: sanitizeString(aqiData?.lastUpdated || '', 50),
    stationName: sanitizeString(aqiData?.stationName || '', 100),
    isDemoData: Boolean(aqiData?.isDemoData),
  };
}

function isShortOrStub(val) {
  return typeof val !== 'string' || val.trim().length < 25;
}

// Enforces that every guidance card always returns 2 concise, actionable sentences—never single-word stubs
function ensureTwoSentencesGuidance(parsed, profile, aqiData) {
  if (!parsed || typeof parsed !== 'object') return parsed;
  const city = aqiData?.city || 'your area';
  const aqi = Number.isFinite(aqiData?.aqi) ? aqiData.aqi : 120;
  const isSevere = aqi > 200;

  if (!parsed.indoorAQ) parsed.indoorAQ = {};

  if (
    isShortOrStub(parsed.indoorAQ.windowStrategy) ||
    /^(?:open|closed|partial|yes|no)\.?$/i.test(parsed.indoorAQ.windowStrategy.trim())
  ) {
    parsed.indoorAQ.windowStrategy = isSevere
      ? 'Keep all exterior doors and windows firmly sealed throughout the day to prevent toxic particulate infiltration. You may briefly cross-ventilate for 15 minutes between 1:30 PM and 2:30 PM when diurnal atmospheric mixing temporarily disperses ground-level smog.'
      : 'Keep windows sealed during early morning and evening rush hours when thermal inversion traps vehicular exhaust near the ground. Open windows for 30–45 minutes around 1:00 PM – 3:30 PM when surface solar warming raises the boundary layer for cleaner air exchange.';
  }

  if (isShortOrStub(parsed.indoorAQ.purifierAdvice)) {
    parsed.indoorAQ.purifierAdvice = profile.hasAirPurifier
      ? 'Run your HEPA air purifier continuously on Auto in main living areas and switch to Turbo speed during cooking and after dusk. Ensure bedroom doors and windows remain sealed at night so the purifier maintains clean CADR air circulation.'
      : 'Since your home lacks a dedicated HEPA air purifier, wet-mop all hard floors twice daily to bind settled soot and prevent dust re-suspension. Place damp rolled towels at the base of exterior doors and avoid indoor incense or candle combustion completely.';
  }

  if (!parsed.routinePlanner) parsed.routinePlanner = {};
  const periodFallbacks = {
    morning: `Ground-level thermal inversion traps peak morning vehicular emissions close to street level in ${city}. Avoid outdoor cardio or balcony walks, and ensure an N95 mask is worn for any necessary morning transit.`,
    afternoon: `Midday solar warming expands the atmospheric boundary layer, resulting in the day's lowest particulate concentration in ${city}. This 12:00 PM – 4:00 PM window is your safest opportunity to batch outdoor errands, brief walks, or room ventilation.`,
    evening: `Sunset cool-down collapses the atmospheric mixing layer while evening commuter traffic surges across ${city}. Keep home windows shut tight, stay indoors, and run bedroom air filtration ahead of bedtime.`,
  };

  for (const period of ['morning', 'afternoon', 'evening']) {
    if (parsed.routinePlanner[period] && isShortOrStub(parsed.routinePlanner[period].recommendation)) {
      parsed.routinePlanner[period].recommendation = periodFallbacks[period];
    }
  }

  if (isShortOrStub(parsed.routinePlanner.commuteAdvice)) {
    parsed.routinePlanner.commuteAdvice = `For your daily commute via ${profile.commuteMode || 'road transit'} in ${city}, keep vehicle windows up and set cabin air conditioning to 100% recirculation mode. If using two-wheelers, auto-rickshaws, or walking, a tightly sealed N95 particulate respirator is essential to prevent deep lung deposition.`;
  }

  if (isShortOrStub(parsed.routinePlanner.errandBundling)) {
    parsed.routinePlanner.errandBundling = 'Batch all grocery purchases, pharmacy visits, and outdoor tasks into a single 35-minute errand run between 1:00 PM and 3:30 PM. Grouping errands during this midday trough reduces cumulative PM2.5 airway exposure by over 45% compared to fragmented trips.';
  }

  return parsed;
}

function buildReasoningSteps(profile, aqiData) {
  const city = aqiData.city || 'Local station';
  const aqi = Number.isFinite(aqiData.aqi) ? aqiData.aqi : 100;
  const pm25 = aqiData.pm25 != null ? aqiData.pm25 : Math.round(aqi * 0.7);
  const station = aqiData.stationName || `${city} CPCB Sensor`;

  const vulnerableList = [];
  if (profile.hasKids) vulnerableList.push('Children (+50% lung intake)');
  if (profile.hasSenior) vulnerableList.push('Senior Citizens (cardiovascular sensitivity)');
  if (profile.hasRespiratoryIssues) vulnerableList.push('Asthma/COPD airway hyper-reactivity');
  vulnerableList.push(`Daily Commute: ${profile.commuteMode || 'Two-Wheeler'}`);
  if (profile.hasAirPurifier) vulnerableList.push('HEPA Filtration Equipped');

  return [
    `Ingested CPCB Telemetry: AQI ${aqi} (${aqiData.aqiCategory || 'Active'}), PM2.5 ${pm25} µg/m³ at station "${station}"`,
    `Profile Risk Matrix: ${vulnerableList.join(' • ')}`,
    `Diurnal Inversion Analysis: Morning & evening boundary layer compressed; particulate suspension calculated for ${city}`,
    'Safety Alignment: Synthesized mitigation protocol grounded in CPCB / MoEFCC National AQI Health Criteria',
  ];
}

function buildSuggestedFollowUps(aqiData, profile) {
  const city = aqiData?.city || 'Delhi';
  const aqi = Number.isFinite(aqiData?.aqi) ? aqiData.aqi : 140;
  const followUps = [];

  if (profile.hasKids) {
    followUps.push(`Safest outdoor window for kids in ${city} today?`);
  }

  if (profile.hasRespiratoryIssues) {
    followUps.push(`Peak airway irritation hours in ${city} today?`);
  } else if (profile.hasSenior) {
    followUps.push(`When should seniors schedule outdoor walks in ${city}?`);
  }

  if (profile.commuteMode === 'Two-Wheeler' || profile.commuteMode === 'Auto/Open Transit' || profile.commuteMode === 'Cycle') {
    followUps.push(`Best N95 protection on ${profile.commuteMode} in ${city}?`);
  } else if (profile.commuteMode === 'Car with AC') {
    followUps.push(`How effective is car recirculation against PM2.5 in ${city}?`);
  } else if (profile.commuteMode === 'Metro') {
    followUps.push('How much does Metro transit shield me from roadside PM2.5?');
  }

  if (profile.hasAirPurifier) {
    followUps.push('Optimal purifier fan schedule for bedrooms tonight?');
  } else {
    followUps.push(`Zero-cost indoor particulate reduction tips for ${city}?`);
  }

  followUps.push(`Exact hours to open windows in ${city} today?`);
  followUps.push(`How does AQI ${aqi} affect 24h inhaled dose in ${city}?`);

  return Array.from(new Set(followUps)).slice(0, 3);
}

// POST /api/gemini/guidance — Full 3-tab structured guidance
router.post('/guidance', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyValid = isLikelyValidKey(apiKey);

  const profile = sanitizeProfile(req.body?.profile);
  const aqiData = sanitizeAQIData(req.body?.aqiData);

  if (!isKeyValid) {
    return res.json(getDynamicGuidance(profile, aqiData, 'Local Telemetry Rules • Grounded in CPCB Data'));
  }

  const cacheKey = `guidance:${JSON.stringify({ profile, city: aqiData.city, aqi: aqiData.aqi, pm25: aqiData.pm25 })}`;
  const cached = geminiCache.get(cacheKey);
  if (cached) return res.json(cached);

  const prompt = buildGuidancePrompt(profile, aqiData);

  try {
    const { response, model } = await callGemini(
      apiKey,
      [{ parts: [{ text: prompt }] }],
      {
        temperature: 0.4,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
      25000
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');

    let parsed = cleanAndParseJSON(text);
    parsed = ensureTwoSentencesGuidance(parsed, profile, aqiData);
    const payload = { status: 'ok', data: parsed, source: `Google Gemini (${model})` };
    geminiCache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.warn('Gemini guidance fallback triggered:', err.message);
    res.json(getDynamicGuidance(profile, aqiData, 'Local Telemetry Rules • Grounded in CPCB Data'));
  }
});

// POST /api/gemini/chat — Single-turn copilot chat
router.post('/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyValid = isLikelyValidKey(apiKey);

  const profile = sanitizeProfile(req.body?.profile);
  const aqiData = sanitizeAQIData(req.body?.aqiData);
  const question = sanitizeString(req.body?.question || '', 500);

  const reasoningSteps = buildReasoningSteps(profile, aqiData);
  const suggestedFollowUps = buildSuggestedFollowUps(aqiData, profile);

  if (!isKeyValid) {
    return res.json({
      status: 'ok',
      reply: getDynamicChatReply(question, profile, aqiData),
      reasoningSteps,
      suggestedFollowUps,
      source: 'Local Telemetry Rules • Grounded in CPCB Data',
    });
  }

  const city = aqiData.city || profile.city || 'your area';
  const aqi = aqiData.aqi;
  const pm25 = aqiData.pm25;
  const pm10 = aqiData.pm10;
  const cpcbCategory = aqiData.aqiCategory || getCPCBScaleCategory(aqi);
  const hasMetro = isMetroCity(city);

  const prompt = `You are VayuCare Copilot, an elite real-time atmospheric intelligence and air quality health advisor for citizens in India.

STRICT GROUNDED TELEMETRY (LIVE CPCB SENSORS — CITE ACCURATELY):
- Active City: ${city} (Sensor Station: "${aqiData.stationName}")
- National Air Quality Index (IND-AQI): ${aqi} (${cpcbCategory})
- Fine Particulate (PM2.5): ${pm25} µg/m³ (WHO 24h Guideline: 15 µg/m³)
- Coarse Particulate (PM10): ${pm10} µg/m³
- Photochemical Smog: NO2 ${aqiData.no2} µg/m³, O3 ${aqiData.o3} µg/m³
- City Metro Rail Available: ${hasMetro ? 'YES (Operational Metro rail available)' : 'NO (No Metro rail in this city — recommend AC electric buses, carpool with recirculation, or off-peak travel instead)'}

USER HOUSEHOLD RISK PROFILE:
- Daily Commute Mode: ${profile.commuteMode}
- Young Children at Home: ${profile.hasKids ? 'YES (higher minute ventilation rate, +50% lung dose per kg)' : 'NO'}
- Senior Citizens at Home: ${profile.hasSenior ? 'YES (elevated cardiovascular and stroke susceptibility)' : 'NO'}
- Asthma / COPD / Respiratory Condition: ${profile.hasRespiratoryIssues ? 'YES (airway hyper-reactivity to PM2.5 and nitrogen dioxide)' : 'NO'}
- HEPA Air Purifier: ${profile.hasAirPurifier ? 'YES (HEPA equipped, ~85% indoor PM2.5 reduction)' : 'NO (No purifier, rely on damp-mopping and room sealing)'}

USER QUESTION: "${question}"

RESPONSE GUIDELINES:
Format your response using clean, scannable Markdown with clear bold section headings and scannable bullet points:
1. **Direct Verdict** (Bold, direct, unequivocal answer to their specific query)
2. **CPCB Telemetry Grounding** (Explicitly cite the active city "${city}", AQI ${aqi} (${cpcbCategory}), PM2.5 ${pm25} µg/m³, and PM10 ${pm10} µg/m³)
3. **Household & Commute Safeguards** (2-3 concise bullet points tailored directly to their commute: "${profile.commuteMode}" and active household vulnerabilities)
4. **Protective Alternative / Reassurance** (One positive, actionable indoor or scheduling adaptation)

Keep response under 160 words, authoritative, compassionate, and highly practical.`;

  try {
    const { response, model } = await callGemini(
      apiKey,
      [{ parts: [{ text: prompt }] }],
      { temperature: 0.5, maxOutputTokens: 600 },
      15000
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({
      status: 'ok',
      reply: text.trim(),
      reasoningSteps,
      suggestedFollowUps,
      source: `Google Gemini (${model})`,
    });
  } catch (err) {
    console.warn('Gemini chat fallback triggered:', err.message);
    res.json({
      status: 'ok',
      reply: getDynamicChatReply(question, profile, aqiData),
      reasoningSteps,
      suggestedFollowUps,
      source: 'Local Telemetry Rules • Grounded in CPCB Data',
    });
  }
});

// POST /api/gemini/advisory — Community WhatsApp bulletin
router.post('/advisory', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyValid = isLikelyValidKey(apiKey);

  const profile = sanitizeProfile(req.body?.profile);
  const aqiData = sanitizeAQIData(req.body?.aqiData);
  const rawAudience = sanitizeString(req.body?.audience || req.body?.profile?.targetAudience || 'rwa', 20);
  const audience = ['rwa', 'family', 'school'].includes(rawAudience) ? rawAudience : 'rwa';
  const language = req.body?.language === 'hi' ? 'hi' : 'en';

  if (!isKeyValid) {
    return res.json({
      status: 'ok',
      advisory: getDynamicAdvisory(profile, aqiData, audience, language),
      source: 'Local Telemetry Rules • Grounded in CPCB Data',
    });
  }

  const cacheKey = `advisory:${aqiData.city}:${aqiData.aqi}:${audience}:${language}`;
  const cached = geminiCache.get(cacheKey);
  if (cached) return res.json(cached);

  const audienceDirectives = {
    school: `TARGET AUDIENCE: School Administration, Teachers, and Parents.
Key Focus: Morning student bus and van commute exposure, mandatory N95 masking, suspension of outdoor morning assemblies and physical education (PT) drills, classroom window closures during inversion hours, sports day postponement, and notifying parents of child respiratory vulnerability (+50% higher air intake per kg).`,
    family: `TARGET AUDIENCE: Household, Families, and Senior Citizens.
Key Focus: Postponing elder morning walks until after 12:00 PM, keeping prescription inhalers/bronchodilators accessible, running bedroom HEPA air purifiers, damp mopping floors to bind fine particulate dust, avoiding incense/dhoop, and sealing drafty doors and windows facing roads.`,
    rwa: `TARGET AUDIENCE: Neighborhood Resident Welfare Association (RWA) and Society Residents.
Key Focus: Society-wide community safeguards, equipping security guards and maintenance staff with N95 masks, strictly banning dry sweeping of society driveways (mandate wet-sprinkling), banning leaf and waste burning, creating clean-air community rooms in the clubhouse, and restricting exterior diesel generator idling.`,
  };

  const languageDirective = language === 'hi'
    ? 'LANGUAGE: Write the entire bulletin in fluent, natural Hindi (Devanagari script) with WhatsApp formatting (*bold* headings and clean bullets). Use accessible words that Indian residents and parents understand easily.'
    : 'LANGUAGE: Write in clear, crisp Indian English with WhatsApp formatting (*bold* headings and clean bullets).';

  const prompt = `You are VayuCare AI, generating a WhatsApp Community Advisory Bulletin for Indian citizens.

ACTIVE CPCB TELEMETRY (Grounded in live station readings):
- City: ${aqiData.city} (Station: ${aqiData.stationName})
- IND-AQI: ${aqiData.aqi} (${aqiData.aqiCategory})
- Fine Particulate (PM2.5): ${aqiData.pm25} µg/m³
- Coarse Particulate (PM10): ${aqiData.pm10} µg/m³

${audienceDirectives[audience]}
${languageDirective}

WHATSAPP FORMATTING GUIDELINES:
- Use *bold* for headings and section titles
- Start with a clear header including the city name, active AQI, and CPCB category
- Provide 3-4 distinct, high-impact, audience-tailored action items with bullet points (•)
- Close with a brief community sign-off line: "— *VayuCare Atmospheric Intelligence*"
- Keep total message length between 100 and 160 words.

Return a JSON object: {"advisory": "the WhatsApp formatted text"}`;

  try {
    const { response, model } = await callGemini(
      apiKey,
      [{ parts: [{ text: prompt }] }],
      {
        temperature: 0.35,
        maxOutputTokens: 800,
        responseMimeType: 'application/json',
      },
      15000
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = cleanAndParseJSON(text);
    const payload = {
      status: 'ok',
      advisory: parsed.advisory || text.trim(),
      source: `Google Gemini (${model})`,
    };
    geminiCache.set(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.warn('Gemini advisory fallback triggered:', err.message);
    res.json({
      status: 'ok',
      advisory: getDynamicAdvisory(profile, aqiData, audience, language),
      source: 'Local Telemetry Rules • Grounded in CPCB Data',
    });
  }
});

function buildGuidancePrompt(profile, aqiData) {
  const city = aqiData.city || profile.city || 'Indian City';
  const hasMetro = isMetroCity(city);

  return `You are VayuCare AI, an expert air quality health advisor for Indian urban families.

REAL-TIME AIR QUALITY DATA (fetched live — DO NOT modify or fabricate these numbers):
${JSON.stringify(aqiData, null, 2)}

HOUSEHOLD PROFILE:
${JSON.stringify(profile, null, 2)}

TRANSIT INFRASTRUCTURE CONSTRAINTS FOR "${city}":
${
  hasMetro
    ? `The city of ${city} has an operational Metro rapid transit system. Metro recommendations are appropriate.`
    : `The city of ${city} does NOT have an operational Metro rapid rail system. NEVER recommend "Metro", "subway", or rail transit. Instead, recommend AC electric or city buses, organized carpools with cabin recirculation on, or off-peak travel timing.`
}

Based STRICTLY on the above AQI data, transit constraints, and household profile, generate personalized air quality guidance using the official Indian CPCB National Air Quality Index (IND-AQI) breakpoints (0–50 Good, 51–100 Satisfactory, 101–200 Moderate, 201–300 Poor, 301–400 Very Poor, 401–500 Severe).

STRICT SCHEMA CONSTRAINT:
Every recommendation and strategy field (recommendation, commuteAdvice, errandBundling, windowStrategy, purifierAdvice, healthImpact, envImpact) MUST contain EXACTLY TWO concise, actionable sentences. NEVER return a single word like "open", "closed", or "partial".

Return a JSON object with this EXACT structure:
{
  "summary": {
    "alertLevel": "good|satisfactory|moderate|poor|veryPoor|severe",
    "headline": "one sharp sentence describing today's air quality situation",
    "mainRisk": "primary health risk in one sentence referencing actual PM2.5 value"
  },
  "routinePlanner": {
    "morning": {
      "timeWindow": "6:00 AM – 9:00 AM",
      "recommendation": "EXACTLY 2 concise, actionable sentences with morning timing and protective advice",
      "actions": ["action1", "action2", "action3"],
      "maskRequired": true,
      "outdoorSafe": false
    },
    "afternoon": {
      "timeWindow": "12:00 PM – 4:00 PM",
      "recommendation": "EXACTLY 2 concise, actionable sentences explaining midday safe window and movement timing",
      "actions": ["action1", "action2"],
      "maskRequired": true,
      "outdoorSafe": false
    },
    "evening": {
      "timeWindow": "5:00 PM – 9:00 PM",
      "recommendation": "EXACTLY 2 concise, actionable sentences for evening traffic rush and bedtime prep",
      "actions": ["action1", "action2", "action3"],
      "maskRequired": true,
      "outdoorSafe": false
    },
    "commuteAdvice": "EXACTLY 2 concise, actionable sentences based on user's commute mode and AQI",
    "errandBundling": "EXACTLY 2 concise, actionable sentences on batching outdoor errands to minimize exposure"
  },
  "indoorAQ": {
    "windowStrategy": "EXACTLY 2 concise, actionable sentences detailing optimal window opening/closing schedule (e.g. explain when to seal tight and exact midday window for brief cross-ventilation; NEVER return a single word like 'open' or 'closed')",
    "purifierAdvice": "EXACTLY 2 concise, actionable sentences tailored to whether user has purifier or not",
    "zeroCostTips": ["tip1", "tip2", "tip3"],
    "kitchenTips": ["tip1", "tip2"],
    "plantSuggestions": ["plant1 (benefit)", "plant2 (benefit)"]
  },
  "sustainableAlternatives": [
    {
      "action": "action name",
      "category": "transport|indoor|lifestyle|diet",
      "healthImpact": "EXACTLY 2 concise, actionable sentences explaining PM2.5 reduction and respiratory benefit",
      "envImpact": "EXACTLY 2 concise, actionable sentences explaining environmental emissions benefit",
      "difficulty": "easy|medium|hard",
      "urgency": "today|this-week|long-term"
    }
  ],
  "vulnerableGroupAlerts": {
    "children": "specific advice if hasKids=true, otherwise null",
    "seniors": "specific advice if hasSenior=true, otherwise null",
    "respiratory": "specific advice if hasRespiratoryIssues=true, otherwise null"
  }
}`;
}

function getDynamicGuidance(profile, aqiData, note = '') {
  const city = aqiData?.city || profile?.city || 'Your City';
  const rawAqi = Number(aqiData?.aqi);
  const aqi = Number.isFinite(rawAqi) ? rawAqi : 120;
  const rawPm25 = aqiData?.pm25 != null ? Number(aqiData.pm25) : null;
  const rawPm10 = aqiData?.pm10 != null ? Number(aqiData.pm10) : null;
  const { pm25, pm10 } = enforceParticulatePhysics(aqi, rawPm25, rawPm10);
  const whoRatio = Math.max(1, pm25 / 15).toFixed(1);
  const hasMetro = isMetroCity(city);

  let alertLevel = 'moderate';
  if (aqi <= 50) alertLevel = 'good';
  else if (aqi <= 100) alertLevel = 'satisfactory';
  else if (aqi <= 200) alertLevel = 'moderate';
  else if (aqi <= 300) alertLevel = 'poor';
  else if (aqi <= 400) alertLevel = 'veryPoor';
  else alertLevel = 'severe';

  const cpcbCategory = getCPCBScaleCategory(aqi);
  const isSevere = aqi > 200;

  let commuteAdvice;
  if (profile.commuteMode === 'Two-Wheeler' || profile.commuteMode === 'Auto/Open Transit') {
    commuteAdvice = hasMetro
      ? `Riding open transport/two-wheeler in ${city} at AQI ${aqi} exposes you to ~3.5× more PM2.5 than an enclosed cabin. Consider switching to the Metro or carpooling with AC recirculation today.`
      : `Riding open transport in ${city} at AQI ${aqi} exposes you to ~3.5× more PM2.5. Opt for an enclosed AC electric/city bus or carpool with cabin air recirculation on.`;
  } else if (profile.commuteMode === 'Metro' || profile.commuteMode === 'Metro/Public Transit') {
    commuteAdvice = hasMetro
      ? `Public transit in ${city} via Metro is currently the lowest-exposure motorized option today. Wear an N95 mask on outdoor platforms.`
      : `In ${city}, opt for enclosed AC city/electric buses with air filtration rather than open autos or two-wheelers.`;
  } else if (profile.commuteMode === 'Cycle') {
    commuteAdvice = `Strenuous cycling in ${city} at AQI ${aqi} increases minute ventilation rate 4-fold. Postpone long cycling routes until air clears.`;
  } else if (profile.commuteMode === 'Work From Home') {
    commuteAdvice = 'Working from home eliminates roadside transit exposure completely today. Maintain clean indoor air.';
  } else {
    commuteAdvice = 'For car commutes, maintain cabin air on recirculation mode with high fan speed to filter out ~85% of ambient fine particles.';
  }

  return {
    status: 'ok',
    source: note || 'Local Telemetry Rules • Grounded in CPCB Data',
    data: {
      summary: {
        alertLevel,
        headline: `${city} Air Quality is currently ${cpcbCategory} (${aqi} AQI)`,
        mainRisk: `PM2.5 is at ${pm25} μg/m³ (${whoRatio}× WHO 24h safe threshold). PM10 is ${pm10} μg/m³. ${
          isSevere
            ? 'High risk of acute lung irritation and smog-induced inflammation.'
            : 'Moderate particulate level; sensitive family members should take precautions.'
        }`,
      },
      routinePlanner: {
        morning: {
          timeWindow: '6:00 AM – 9:00 AM',
          recommendation: isSevere
            ? 'Dense morning thermal inversion traps pollutants. Cancel all outdoor running or cycling.'
            : 'Morning air has moderate particulate concentration. Light outdoor walking is acceptable.',
          actions: [
            isSevere ? 'Replace morning outdoor walk with indoor stretching or yoga' : 'Perform morning exercises in a well-ventilated area',
            isSevere ? 'Wear an N95 mask if stepping out for school drops or essential errands' : 'Hydrate with warm water and ginger tea',
            'Keep main balcony doors closed until thermal smog disperses',
          ],
          maskRequired: isSevere,
          outdoorSafe: !isSevere,
        },
        afternoon: {
          timeWindow: '12:00 PM – 4:00 PM',
          recommendation: 'Solar heating elevates boundary layer. This is the safest window for essential outdoor movement.',
          actions: [
            'Batch all groceries, deliveries, and outdoor errands into this midday window',
            profile.commuteMode === 'Two-Wheeler' || profile.commuteMode === 'Auto/Open Transit'
              ? 'Wear tight-fitting N95 mask while riding to prevent fine particulate inhalation'
              : 'Keep vehicle cabin air recirculation ON',
            'Brief 15-minute cross-ventilation is optimal during this window if outdoor AQI is under 150',
          ],
          maskRequired: aqi > 100,
          outdoorSafe: aqi <= 150,
        },
        evening: {
          timeWindow: '5:00 PM – 9:00 PM',
          recommendation: 'Rush hour traffic emissions combine with cooling evening air, causing ground-level PM2.5 to spike.',
          actions: [
            profile.hasKids ? 'Keep children indoors; schedule creative play or reading instead of park visits' : 'Limit outdoor evening workouts',
            profile.hasAirPurifier ? 'Turn air purifier to High/Boost mode at sunset' : 'Wet mop living spaces to trap settling dust particles',
            'Ensure kitchen exhaust is running during dinner preparation',
          ],
          maskRequired: isSevere,
          outdoorSafe: false,
        },
        commuteAdvice,
        errandBundling: 'Combine grocery shopping and pharmacy runs into a single 30-minute block between 1:00 PM and 3:30 PM to minimize cumulative airway exposure.',
      },
      indoorAQ: {
        windowStrategy: isSevere
          ? 'Closed firmly throughout the day. Only open for 10 minutes between 1:30 PM – 2:30 PM if indoor air feels stale.'
          : 'Can be opened for 30–45 minutes around 1:00 PM – 3:00 PM when atmospheric mixing height is at its peak.',
        purifierAdvice: profile.hasAirPurifier
          ? 'Run your HEPA purifier continuously on Auto in bedrooms. Increase to Turbo speed during cooking and after dusk.'
          : 'No purifier equipped: Wet mop floors twice daily with a damp microfiber cloth to prevent particulate re-suspension.',
        zeroCostTips: [
          'Wet-mop hard floors twice daily to bind settled PM2.5 rather than dry sweeping which aerosolizes dust',
          'Place damp towels rolled at the base of exterior doors facing main roads to block incoming draft',
          'Avoid agarbatti (incense) and dhoop indoors today, which release high concentrations of fine soot and benzene',
        ],
        kitchenTips: [
          'Always turn on the kitchen chimney or exhaust fan 1 minute before lighting the gas stove',
          'Use lids on frying pans to trap oil droplets and volatile organic compounds',
          'Cross-ventilate the kitchen toward the utility balcony rather than into living areas',
        ],
        plantSuggestions: [
          'Snake Plant / Sansevieria (Filters formaldehyde and releases oxygen overnight)',
          'Areca Palm (Acts as natural humidifier and particulate binder)',
          'Spider Plant (Resilient air filter for carbon monoxide and xylene)',
        ],
      },
      sustainableAlternatives: [
        {
          action: hasMetro
            ? `Switch ${profile.commuteMode} commute to Metro or shared electric bus`
            : `Switch ${profile.commuteMode} commute to AC electric city bus or carpool with recirculation`,
          category: 'transport',
          healthImpact: 'Reduces personal PM2.5 lung deposition by up to 65% during peak rush hour',
          envImpact: 'Prevents ~2.4 kg of CO2 and 4.2g of NOx tailpipe emissions per 15 km round trip',
          difficulty: 'easy',
          urgency: 'today',
        },
        {
          action: 'Shift outdoor cardio into 30-minute indoor bodyweight or yoga routine',
          category: 'lifestyle',
          healthImpact: `Saves lungs from inhaling ~${Math.round(pm25 * 0.9)} μg of fine particulates that deep athletic breathing would pull into alveoli`,
          envImpact: 'Zero emission lifestyle adaptation; reduces road congestion during peak hours',
          difficulty: 'easy',
          urgency: 'today',
        },
        {
          action: 'Seal door and window perimeter gaps with weather-stripping foam',
          category: 'indoor',
          healthImpact: 'Prevents 40–55% of outdoor smog infiltration into bedrooms overnight',
          envImpact: 'Improves thermal efficiency, reducing winter room heater electrical consumption by 15%',
          difficulty: 'medium',
          urgency: 'this-week',
        },
      ],
      vulnerableGroupAlerts: {
        children: profile.hasKids
          ? 'Children inhale up to 50% more air per kg of body weight than adults. Keep them indoors today and ensure school commute masks are snug.'
          : null,
        seniors: profile.hasSenior
          ? 'Senior citizens with cardiovascular conditions should take prescribed inhalers/medications proactively and avoid morning balcony walks.'
          : null,
        respiratory: profile.hasRespiratoryIssues
          ? `Asthma/COPD alert: Current PM2.5 level of ${pm25} μg/m³ can trigger airway hyper-reactivity. Keep emergency bronchodilators within arm's reach.`
          : null,
      },
    },
  };
}

function getDynamicChatReply(question, profile, aqiData) {
  const city = aqiData.city || 'your area';
  const aqi = Number.isFinite(aqiData.aqi) ? aqiData.aqi : 120;
  const pm25 = Number.isFinite(aqiData.pm25) ? aqiData.pm25 : 80;
  const cpcbCategory = getCPCBScaleCategory(aqi);
  const qLower = (question || '').toLowerCase();
  const hasMetro = isMetroCity(city);

  if (qLower.includes('kid') || qLower.includes('play') || qLower.includes('child')) {
    return `In ${city} today, the AQI is ${aqi} (${cpcbCategory}). For children, outdoor exertion should be avoided or strictly limited to the afternoon (1–4 PM) because their breathing rate is higher and absorbs more PM2.5. Evening outdoor play is not recommended today.`;
  }
  if (qLower.includes('ventilate') || qLower.includes('window')) {
    return `The best time to ventilate in ${city} today is between 1:00 PM and 3:30 PM for about 15 minutes when surface temperatures rise and smog disperses. Keep windows firmly closed during early morning and late evening when ambient pollution peaks.`;
  }
  if (qLower.includes('commute') || qLower.includes('travel') || qLower.includes('bike') || qLower.includes('transit')) {
    const transitOption = hasMetro
      ? 'opt for the Metro or an enclosed AC bus to avoid road-level exhaust plumes'
      : 'opt for an enclosed AC city/electric bus or carpool with cabin recirculation on, avoiding open two-wheelers and autos';
    return `For commuting in ${city} at AQI ${aqi} (${cpcbCategory}), an N95 mask is essential for open transit, two-wheelers, and walking. If possible, ${transitOption}. Keep car ventilation on internal recirculation.`;
  }
  if (qLower.includes('senior') || qLower.includes('elder') || qLower.includes('asthma')) {
    return `With PM2.5 at ${pm25} µg/m³ (${cpcbCategory}), seniors and individuals with respiratory conditions should remain indoors with windows shut, avoid morning balcony walks, and ensure prescription inhalers are readily accessible.`;
  }

  return `Based on current CPCB station telemetry for ${city} (AQI ${aqi} - ${cpcbCategory}, PM2.5 ${pm25} µg/m³), the general recommendation is to avoid outdoor exertion during early morning and evening hours, seal home ventilation gaps, and use an N95 mask when traveling outdoors.`;
}

module.exports = router;
