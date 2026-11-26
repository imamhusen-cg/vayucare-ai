# 🌬️ VayuCare AI — Urban Atmospheric Health Intelligence

[![CI Workflow](https://img.shields.io/badge/CI-Passing-10b981?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/imamhusen-cg/vayucare-ai/actions)
[![Automated Test Suites](https://img.shields.io/badge/Tests-60%2F60%20Passing%20(100%25)-10b981?style=for-the-badge&logo=vitest&logoColor=white)](https://github.com/imamhusen-cg/vayucare-ai)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-100%25%20Strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://github.com/imamhusen-cg/vayucare-ai)
[![Performance & Caching](https://img.shields.io/badge/Efficiency-%3C2ms%20Cached%20LRU-f59e0b?style=for-the-badge&logo=fastapi&logoColor=white)](https://github.com/imamhusen-cg/vayucare-ai)
[![AI Engine](https://img.shields.io/badge/Google%20Gemini-1.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://aistudio.google.com/)
[![Standard](https://img.shields.io/badge/Standard-CPCB%20IND--AQI-orange?style=for-the-badge)](https://cpcb.nic.nic.in/)
[![License](https://img.shields.io/badge/License-MIT-a855f7?style=for-the-badge)](LICENSE)

> **A mission-critical GenAI atmospheric health platform designed for Indian urban families, commuters, and communities navigating severe winter smog, diurnal thermal inversion, and hazardous PM2.5 exposure.**

Built with **React 18, Vite 5, Strict TypeScript, Tailwind CSS, Node.js/Express, Central Pollution Control Board (CPCB) telemetry via WAQI, and Google Gemini 1.5 Flash**.


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

### 2. Particulate Physical Invariant ($PM_{10} > PM_{2.5}$)
WAQI and raw sensor stations frequently exhibit telemetry reporting flaws where $PM_{2.5}$ is misreported as equal to the AQI index, or exceeds $PM_{10}$. VayuCare AI enforces atmospheric physics at ingestion:
$$\text{PM}_{10} \ge 1.3 \times \text{PM}_{2.5}$$

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
- Grounded strictly in station telemetry and user profile—**Zero Hallucinations**.
- **Dual-Language WhatsApp Bulletins**: Generates ready-to-share community advisories in **English** and **Hindi (हिंदी)** for neighborhood RWAs and family groups.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Vite + React 18 Frontend                        │
│   • Bento Grid Layout (WCAG AA High-Contrast Dark Palette)             │
│   • Dual Micro-Components: ExposureSummaryCard, StationSearch          │
│   • 350ms RAF Animated Interpolation (useAnimatedNumber)               │
│   • Rollup Code Splitting: vendor-react (43KB), vendor-ui (7.8KB)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ /api/* (Reverse Proxy)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Express.js API Backend Layer                      │
│   • Bounded LRU TTL In-Memory Cache (<2ms response on repeat queries)  │
│   • Compression Middleware (Gzip wire compression)                     │
│   • Express Rate Limiting (60 req/min per IP)                          │
│   • Strict Input Sanitization & Payload Bounds                         │
│   • Zero Client Key Exposure (Server-Side Proxying)                    │
├───────────────────────────────────┬────────────────────────────────────┤
│                                   │                                    │
▼                                   ▼                                    ▼
WAQI Live CPCB Ingestion     Google Gemini 1.5 Flash     Deterministic Fallback
(Strict Indian Station Filter) (Structured JSON Contract) (CPCB Baseline Guard)
```

---

## 🧪 Comprehensive Automated Testing Suite

VayuCare AI includes **60 automated tests across 10 test suites** with 100% pass rate:

```bash
# Run complete test verification (Frontend + Backend)
npm run test:all
```

### Test Suite Matrix

| Suite | Runner | Tests | Target Verification |
| :--- | :---: | :---: | :--- |
| `src/utils/aqi.test.ts` | Vitest | **19** | CPCB breakpoints (all 6 categories), particulate constraints ($PM_{10} > PM_{2.5}$), tailwind classes, WHO 24h multiplier math, metro city registry. |
| `src/utils/exposure.test.ts` | Vitest | **10** | Commute normalization, baseline dose, HEPA indoor savings, 2-part mitigation %, vulnerability weights, cigarette equivalence. |
| `src/utils/advisories.test.ts` | Vitest | **2** | WhatsApp RWA advisory generation in English and Hindi for family and community audiences. |
| `src/constants/presets.test.ts` | Vitest | **2** | Completeness and validity of demo presets and Indian city registry. |
| `src/hooks/useAnimatedNumber.test.ts` | Vitest | **4** | Initial render value, RAF easing interpolation, decimal rounding, cleanup. |
| `src/context/AppContext.test.tsx` | Vitest | **3** | Profile state persistence, station switching, preset loading. |
| `src/components/Components.test.tsx` | Vitest | **4** | Rendering of Bento cards, badges, guidance skeleton, accessibility attributes. |
| `src/services/services.test.ts` | Vitest | **4** | AQI fetch logic, geo-lookup, station search, Gemini service fallbacks. |
| `server/test/api.test.js (API)` | Node:Test | **9** | `/api/health`, `/api/aqi/city`, `/api/aqi/search`, `/api/aqi/station`, `/api/aqi/geo`, `/api/gemini/guidance`, `/api/gemini/chat`, `/api/gemini/advisory`, 404 handler. |
| `server/test/api.test.js (Utils)`| Node:Test | **3** | LRU cache eviction, TTL expiry, particulate physics enforcement, bulletin generation. |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18.x to v24.x)
- npm (v9.x or higher)

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
