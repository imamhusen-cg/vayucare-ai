# 🌬️ VayuCare AI — Urban Air Quality Assistant

> **A GenAI-powered air quality and low-emission lifestyle assistant designed for Indian families and communities navigating severe winter smog and urban air pollution.**

Built with **React, Vite, TypeScript, Tailwind CSS, Node.js/Express, WAQI (World Air Quality Index) API, and Google Gemini 1.5 Flash**.

---

## 🌟 Key Features

### 1. ⚡ One-Click Evaluator Sample Presets
Instantly test personalized AI recommendations without manual form entry:
- **Delhi Family**: 2 Young Children + Senior Citizen, No Air Purifier, Car Commuter.
- **Mumbai Commuter**: Mild Asthma/Respiratory Sensitivity, Daily Local Train / Public Transit Commute, No Purifier.
- **Kolkata Student Athlete**: Evening Outdoor Sports, Cycle Commute, Owns HEPA Purifier.

### 2. 🏠 Household & Lifestyle Profile Customization
- **City / Locality Selection**: Covers top polluted and metro Indian hubs (Delhi, Noida, Gurugram, Mumbai, Kolkata, Bengaluru, Lucknow, Patna, Chennai, Hyderabad, Ahmedabad, Pune, Jaipur, Chandigarh, Varanasi).
- **Vulnerability Toggles**: Young Children (`👶 Kids`), Senior Citizens (`🧓 Senior`), Respiratory Sensitivity (`🫁 Asthma/COPD`).
- **Commute Mode**: Two-Wheeler, Car, Metro/Public Transit, Work From Home, Bicycle.
- **Equipment**: Air Purifier ownership toggle.
- **State Persistence**: Preferences are saved to `localStorage` and trigger reactive AI recalculations whenever changed.

### 3. 🎯 Three Action Tabs (Grounded in Real Live AQI + Household Profile)
- **Tab A: Low-Emission Daily Routine & Commute Planner**
  - Time-slotted recommendations for **Morning (6–9 AM)**, **Afternoon (12–4 PM)**, and **Evening (5–9 PM)**.
  - Tailored mask advisory (e.g. N95/FFP2 requirement flags) and outdoor safety indicators.
  - Commute swap suggestions (e.g. switching from open two-wheelers to metro during severe smog to reduce inhaled dose by 70%).
  - Smart errand bundling to minimize peak-hour exposure windows.
  - Dedicated vulnerable group alerts for children and elders.
- **Tab B: Indoor Air Quality (IAQ) Action Hacks**
  - **Window Strategy**: Precise guidance on sealing vs. opening windows based on outdoor AQI and time of day.
  - **Purifier Runtime Guidance**: Filter maintenance and mode recommendations for owners.
  - **Zero-Cost Alternatives**: For households without purifiers (cross-ventilation timing, wet mopping to settle PM2.5, towel door seals, incense/agarbatti smoke avoidance).
  - **Kitchen Air Management**: Exhaust fan protocols and low-smoke cooking practices.
  - **Air-Purifying Plants**: NASA-recommended indoor plants (Snake Plant, Spider Plant, Peace Lily) with specific VOC absorption benefits.
- **Tab C: Sustainable Alternatives & Impact Justification**
  - Action cards categorized by Transport, Indoor, Lifestyle, and Diet.
  - **"Why This Works & Direct Impact"**:
    - **Direct Health Impact**: Quantified PM2.5 lung deposition prevention.
    - **Direct Environmental Benefit**: CO₂ reduction metrics for community emission abatement.
  - Difficulty ratings (`Easy`, `Medium`, `Hard`) and Urgency timelines (`Today`, `This Week`, `Long-term`).

### 4. 💬 Context-Aware "Ask VayuCare" Family Copilot & Community WhatsApp Bulletin
- Interactive slide-over drawer grounded strictly in live station metrics and active profile.
- **Smart Prompt Chips**:
  - *"Can my kids play outside this evening?"*
  - *"Best time to ventilate my house today?"*
  - *"How should I modify my commute?"*
  - *"Is it safe for my senior family member to go out?"*
- **📲 Generate Community / WhatsApp Advisory**: One-click generation of emoji-formatted, ready-to-copy bulletins tailored for neighborhood Resident Welfare Associations (RWAs) and family WhatsApp groups.

### 5. 🛡️ Data Transparency & Graceful Fallback
- Displays live station name, source (`WAQI`), and exact timestamp.
- **Zero Hallucination Policy**: Real AQI, PM2.5, PM10, NO₂, and O₃ readings are passed as structured JSON context to Gemini. The model never fabricates pollution levels.
- **Graceful Fallbacks**: If the WAQI API rate-limits or an API key is not yet configured, the system automatically switches to clearly labeled fallback/demo data with a badge so testers can evaluate all features without blocking.

---

## 🏛️ System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│   • Tailwind CSS (Accessible WCAG AA Contrast, Dark Palette) │
│   • AppContext (React Context + LocalStorage persistence)    │
│   • Components: PresetBanner, AQIDashboard, ProfileBar       │
│   • Action Tabs: RoutineTab, IndoorTab, SustainableTab       │
│   • ChatDrawer: Family Copilot + Community WhatsApp Share    │
└──────────────────────────────┬───────────────────────────────┘
                               │ /api/* (Vite Proxy)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│             Backend API Layer (Express.js / Node)            │
│   • Rate Limiting: 60 req/min per IP                         │
│   • Input Sanitization & Payload Truncation                  │
│   • Secure API Key Storage (Zero keys exposed to browser)    │
├──────────────────────────────┬───────────────────────────────┤
│                              │                               │
▼                              ▼                               ▼
WAQI Live AQI API       Google Gemini 1.5 Flash        Graceful Fallback
(aqicn.org REST API)    (Structured JSON Prompting)    (Real-world baseline)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### 1. Installation
Clone the repository and install dependencies for both frontend and backend:

```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd server
npm install
cd ..
```

### 2. Environment Setup (Optional for Live API Keys)
The application works immediately in **Demo / Fallback mode** out of the box. To enable live real-time AQI and live Gemini generation:

1. Copy the environment template in `server/`:
   ```bash
   cp server/.env.example server/.env
   ```
2. Open `server/.env` and supply your keys:
   ```env
   # Free WAQI Token: https://aqicn.org/data-platform/token/
   WAQI_API_TOKEN=your_waqi_token_here

   # Free Google Gemini API Key: https://aistudio.google.com/app/apikey
   GEMINI_API_KEY=your_gemini_api_key_here

   PORT=3001
   ALLOWED_ORIGIN=http://localhost:5173
   ```

### 3. Running the Application

Open two terminal windows:

**Terminal 1: Start Backend Server**
```bash
cd server
node index.js
# Backend starts on http://localhost:3001
```

**Terminal 2: Start Frontend Application**
```bash
npm run dev
# Vite dev server starts on http://localhost:5173
```

Open your browser to `http://localhost:5173`.

---

## 🤖 Prompt Engineering & Structured JSON Flow

The backend enforces a strict contract with the Gemini API using `responseMimeType: "application/json"`.

### Prompt Structure
```
REAL-TIME AIR QUALITY DATA (fetched live — DO NOT modify or fabricate these numbers):
{ "city": "Delhi", "aqi": 348, "pm25": 286, "pm10": 395, "no2": 82, ... }

HOUSEHOLD PROFILE:
{ "city": "Delhi", "hasKids": true, "hasSenior": true, "commuteMode": "Car", "hasAirPurifier": false }
```

### Response Schema Output
```json
{
  "summary": { "alertLevel": "hazardous", "headline": "...", "mainRisk": "..." },
  "routinePlanner": {
    "morning": { "timeWindow": "6:00 AM – 9:00 AM", "recommendation": "...", "actions": [], "maskRequired": true, "outdoorSafe": false },
    "afternoon": { ... },
    "evening": { ... },
    "commuteAdvice": "...",
    "errandBundling": "..."
  },
  "indoorAQ": {
    "windowStrategy": "...",
    "purifierAdvice": "...",
    "zeroCostTips": [],
    "kitchenTips": [],
    "plantSuggestions": []
  },
  "sustainableAlternatives": [
    {
      "action": "...",
      "category": "transport",
      "healthImpact": "...",
      "envImpact": "...",
      "difficulty": "easy",
      "urgency": "today"
    }
  ],
  "vulnerableGroupAlerts": { "children": "...", "seniors": "...", "respiratory": null }
}
```

---

## ♿ Accessibility & Code Quality Standards

- **Semantic HTML**: `<header>`, `<main>`, `<section>`, `<footer`, `<button>`, `role="tablist"`, `role="tab"`, `role="tabpanel"`.
- **Keyboard Navigable**: Proper tab ordering, visible focus rings (`focus-visible:ring-vayu-400`), and accessible dialog modals (`role="dialog"` with ESC/click-outside dismiss).
- **High Contrast**: Dark theme palette adhering to WCAG AA color contrast guidelines on dark backgrounds (`slate-950`, `slate-900`, `vayu-400`, `green-400`, `amber-400`, `red-400`).
- **Resilient UI**: Loading skeletons for all dynamic components to prevent Cumulative Layout Shift (CLS).

---

## 📄 License
MIT License. Built for community health and clean air advocacy across Indian cities.

