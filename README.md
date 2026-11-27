# 🌬️ VayuCare AI — Urban Atmospheric Health Intelligence

[![Live Demo](https://img.shields.io/badge/Live%20Demo-vayucare--ai.vercel.app-0ea5e9?style=for-the-badge&logo=vercel&logoColor=white)](https://vayucare-ai.vercel.app)
[![VayuCare AI CI](https://github.com/imamhusen-cg/vayucare-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/imamhusen-cg/vayucare-ai/actions/workflows/ci.yml)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-100%25%20Strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/imamhusen-cg/vayucare-ai)
[![Caching](https://img.shields.io/badge/Cache-Bounded%20LRU%20TTL-f59e0b?style=for-the-badge&logo=fastapi&logoColor=white)](https://github.com/imamhusen-cg/vayucare-ai)
[![AI Engine](https://img.shields.io/badge/Google%20Gemini-Flash%203.x%20%2F%20Latest-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![Standard](https://img.shields.io/badge/Standard-CPCB%20IND--AQI-orange?style=for-the-badge)](https://cpcb.nic.in/)
[![License](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)](LICENSE)

> **🌐 Live Application:** **[https://vayucare-ai.vercel.app](https://vayucare-ai.vercel.app)**
>
> **A mission-critical GenAI atmospheric health platform designed for Indian urban families, commuters, and communities navigating severe winter smog, diurnal thermal inversion, and hazardous PM2.5 exposure.**

Built with **React 18, Vite 6, Strict TypeScript, Tailwind CSS, Node.js/Express 5, Central Pollution Control Board (CPCB) telemetry via WAQI, and Google Gemini Flash (3.x / Latest)**.


## 🔬 Scientific & Algorithmic Foundations

### 1. Official CPCB National Air Quality Index (IND-AQI) Breakpoints
Unlike generic US EPA scales, VayuCare AI adheres strictly to the official Central Pollution Control Board (CPCB) sub-index criteria mandated by the Ministry of Environment, Forest and Climate Change (MoEFCC):

| Category | AQI Range | PM2.5 Sub-Index Range | Color Token | Health Impact Statement |
| :--- | :---: | :---: | :---: | :--- |
| **Good** | 0–50 | 0–30 µg/m³ | `#4cc38a` | Minimal impact |
| **Satisfactory** | 51–100 | 31–60 µg/m³ | `#84cc16` | Minor breathing discomfort to sensitive people |
| **Moderate** | 101–200 | 61–90 µg/m³ | `#eab308` | Breathing discomfort to people with asthma, heart disease |
| **Poor** | 201–300 | 91–120 µg/m³ | `#f97316` | Breathing discomfort on prolonged exposure |
| **Very Poor** | 301–400 | 121–250 µg/m³ | `#ef4444` | Respiratory illness on prolonged exposure |
| **Severe** | 401–500+ | 251–380+ µg/m³ | `#dc2626` | Severe pulmonary risk even for healthy adults |

### 2. Transparent Telemetry & Honest Estimation
Measured station readings (`pm25`, `pm10`) reported by WAQI are passed directly through untouched. Only when a station omits PM2.5 or PM10 does VayuCare derive an estimate from the official CPCB AQI sub-index—and explicitly marks `pm25Estimated` / `pm10Estimated` (`Est. from AQI` badge in UI and noted in AI prompts) so estimated values are never disguised as sensor measurements.

### 3. Dynamic 24-Hour Inhaled Dose & Mitigation Modeling
An adult inhales approximately $15\text{ m}^3$ of air per day, divided across micro-environments:
$$\text{Dose}_{\text{baseline}} = \left( C_{\text{home}} \times V_{\text{home}} \times t_{\text{home}} + C_{\text{work}} \times V_{\text{work}} \times t_{\text{work}} + C_{\text{commute}} \times V_{\text{commute}} \times t_{\text{commute}} \right) \times M_{\text{vuln}}$$

- **Physiological Vulnerability Multipliers ($M_{\text{vuln}}$)**:
  - Children: $+25\%$ (higher minute ventilation per kg, developing alveolar surface)
  - Asthma / COPD: $+30\%$ (hyperactive bronchial reactivity and particulate retention)
  - Senior Citizens: $+15\%$ (diminished mucociliary clearance)
- **Active Mitigation Shields**:
  - **Indoor HEPA Filtration**: $-82\%$ indoor PM2.5 ($14\text{h}$ home cycle)
  - **Sealed Metro Rail / AC Car Cabin**: $-58\%$ to $-68\%$ transit particulate ($2\text{h}$ commute)

### 4. Berkeley Earth Cigarette Inhalation Equivalence
Following the landmark Berkeley Earth peer-reviewed formulation ($22\ \mu\text{g/m}^3\text{ PM}_{2.5}\text{ for }24\text{h} \approx 1\text{ cigarette}$, inhaling approximately $330\ \mu\text{g}$ of fine particulate):
$$\text{Cigarettes}_{\text{equiv}} = \frac{\text{Total Inhaled Dose } (\mu\text{g})}{330\ \mu\text{g}}$$

---

## 🌟 Key Application Features

### 1. ⚡ One-Click Evaluator Persona Presets
Instantly test localized, personalized AI recommendations without manual data entry:
- **Delhi Family**: Children + Senior citizen, natural ventilation only, AC car commute.
- **Mumbai Commuter**: Mild asthma, daily suburban metro/train commuter, no home purifier.
- **Kolkata Cyclist**: Evening outdoor cyclist, high exertion, equipped with home HEPA purifier.

### 2. 🛡️ Dynamic Bento Grid Atmospheric Dashboard
- **Dynamic Glow Ambient Atmosphere**: Smooth, non-distracting radial atmospheric glow shifting color according to active CPCB scale (`#10B981` emerald $\rightarrow$ `#F59E0B` amber $\rightarrow$ `#EF4444` red $\rightarrow$ `#BE123C` crimson).
- **Smooth Number Interpolation**: Animated numeric transitions across 350ms using an `easeOutCubic` curve.
- **Real-time Inhaled Dose Shield Card**: Visualizes daily baseline unprotected dose vs. protected dose, total saved dose, and cigarette equivalents avoided.

### 3. 🎯 Three Contextual Action Tabs (Grounded in CPCB Telemetry)
- **Tab A: Low-Emission Daily Routine & Commute Planner**
  - Time-segmented windows: Morning (6–9 AM), Midday (12–4 PM), Evening (5–9 PM).
  - Transit-aware recommendations (adapts to Sealed Metro Rail in Delhi/Mumbai vs. AC City Bus in Kota/Mangalore).
  - Smart errand bundling to avoid peak boundary-layer inversion hours.
- **Tab B: Indoor Air Quality (IAQ) Action Hacks**
  - Real-time window sealing vs. cross-ventilation windows.
  - Zero-cost mitigation hacks for non-purifier households (wet mopping, towel door seals, agarbatti/dhoop smoke elimination).
  - Kitchen exhaust protocols and NASA-tested VOC-absorbing botanical plants (Snake Plant, Spider Plant, Peace Lily).
- **Tab C: Sustainable Alternatives & Carbon Abatement**
  - Actionable swaps scored by health benefit, environmental abatement, difficulty, and urgency.

### 4. 💬 Context-Aware Family Copilot & Community WhatsApp Broadcasts
- Grounded in active station telemetry and user profile—clearly distinguishing measured sensor values from AQI-derived estimates.
- **Dual-Language WhatsApp Bulletins**: Generates ready-to-share community advisories in **English** and **Hindi (हिंदी)** for neighborhood RWAs and family groups.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Vite + React 18 Frontend                        │
│   • Bento Grid Layout (WCAG AA Dark Palette + Reduced Motion Support)  │
│   • Modular Components: ExposureSummaryCard, StationSearch, ErrorTrap  │
│   • 350ms RAF Animated Interpolation (useAnimatedNumber)               │
│   • Rollup Code Splitting: vendor-react & vendor-ui chunks             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ /api/* (Reverse Proxy)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Express.js API Backend Layer                      │
│   • Bounded LRU TTL In-Memory Cache (5m Telemetry / 5m Guidance)       │
│   • Compression Middleware (Gzip wire compression)                     │
│   • Tiered Rate Limiting (60/min global, 20/min /api/gemini/*)         │
│   • Strict Input Sanitization, Commute Whitelist & Helmet Security     │
│   • Zero Client Key Exposure (Server-Side Proxying)                    │
├───────────────────────────────────┬────────────────────────────────────┤
│                                   │                                    │
▼                                   ▼                                    ▼
WAQI Live CPCB Ingestion     Google Gemini Flash (3.x/Latest) Deterministic Fallback
(Strict Indian Station Filter) (Structured JSON Contract) (CPCB Baseline Guard)
```

---

## 🧪 Automated Testing & Coverage

VayuCare AI includes **62 automated tests across 11 suites** (50 frontend Vitest + 12 backend `node:test`):

```bash
# Run both Frontend & Backend suites
npm run test:all

# Run Vitest with V8 code coverage report
npm run test:coverage
```

### Test Suite Matrix

| Suite | Runner | Tests | Target Verification |
| :--- | :---: | :---: | :--- |
| `src/utils/aqi.test.ts` | Vitest | **19** | CPCB breakpoints (all 6 categories), honest sensor pass-through vs missing estimation flags, tailwind classes, WHO 24h multiplier math, metro city registry. |
| `src/utils/exposure.test.ts` | Vitest | **10** | Commute normalization, baseline dose, HEPA indoor savings, 2-part mitigation %, vulnerability weights, cigarette equivalence. |
| `src/utils/advisories.test.ts` | Vitest | **2** | WhatsApp RWA advisory generation in English and Hindi for family and community audiences. |
| `src/constants/presets.test.ts` | Vitest | **2** | Completeness and validity of demo presets and Indian city registry. |
| `src/hooks/useAnimatedNumber.test.ts` | Vitest | **4** | Initial render value, RAF easing interpolation, decimal rounding, reduced motion support. |
| `src/context/AppContext.test.tsx` | Vitest | **3** | Profile state persistence, station switching, preset loading. |
| `src/components/ErrorBoundary.test.tsx` | Vitest | **2** | Runtime exception boundary isolation and accessible recovery fallback UI. |
| `src/components/Components.test.tsx` | Vitest | **4** | Rendering of Bento cards, badges, guidance skeleton, accessibility attributes. |
| `src/services/services.test.ts` | Vitest | **4** | AQI fetch logic, geo-lookup, station search, Gemini service fallbacks. |
| `server/test/api.test.js (API)` | Node:Test | **9** | `/api/health` + Helmet headers, `/api/aqi/city`, `/api/aqi/search`, `/api/aqi/station`, `/api/aqi/geo`, `/api/gemini/guidance`, `/api/gemini/chat`, `/api/gemini/advisory`, 404 handler. |
| `server/test/api.test.js (Utils)`| Node:Test | **3** | LRU cache eviction, TTL expiry, sensor pass-through & fallback estimation, bulletin generation. |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js **v22.22.2+ or v24.x** (matching `.nvmrc` & `engines`)
- npm (v10.x or higher)

### 1. Installation
```bash
# Clone the repository
git clone https://github.com/imamhusen-cg/vayucare-ai.git
cd vayucare-ai

# Install frontend dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Environment Configuration
The application runs out of the box in **Deterministic CPCB Mode**. To connect live API keys:
```bash
# In the server/ directory:
cp server/.env.example server/.env
```
Edit `server/.env`:
```env
# Free WAQI Token: https://aqicn.org/data-platform/token/
WAQI_API_TOKEN=your_waqi_token_here

# Free Google Gemini API Key: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

PORT=3001
ALLOWED_ORIGIN=http://localhost:5173
```

### 3. Verification & Build
```bash
# 1. Run all unit & integration tests (Vitest + Node:Test)
npm run test:all

# 2. Verify strict TypeScript & produce production bundle
npm run build
```

### 4. Running Locally
```bash
# Terminal 1: Start API server (port 3001)
npm run server

# Terminal 2: Start Vite frontend (port 5173)
npm run dev
```

---

## 📄 License
MIT License. Built with pride for clean air and community atmospheric health across Indian cities.
