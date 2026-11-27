export interface AQIData {
  status: 'live' | 'demo' | 'fallback';
  city: string;
  aqi: number;
  pm25: number | null;
  pm10: number | null;
  no2: number | null;
  o3: number | null;
  co: number | null;
  so2: number | null;
  dominentPol: string;
  stationName: string;
  stationUid?: number;
  pm25Estimated?: boolean;
  pm10Estimated?: boolean;
  cachedAt?: string;
  stationRecordedAt?: string;
  feedSyncedAt?: string;
  lastUpdated: string;
  source: string;
  aqiCategory: AQICategory;
  isDemoData: boolean;
  fallbackReason?: string;
}

export type AQICategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe'
  | string;

export type AlertLevel = 'good' | 'satisfactory' | 'moderate' | 'poor' | 'veryPoor' | 'severe' | string;

export interface UserProfile {
  city: string;
  hasKids: boolean;
  hasSenior: boolean;
  hasRespiratoryIssues: boolean;
  commuteMode: CommuteMode;
  hasAirPurifier: boolean;
  hasMask?: boolean;
  targetAudience?: 'rwa' | 'family' | 'school';
}

export type CommuteMode =
  | 'Cycle'
  | 'Auto/Open Transit'
  | 'Car with AC'
  | 'Metro'
  | 'Work From Home'
  | 'Two-Wheeler'
  | 'Car'
  | 'Metro/Public Transit';

export interface DemoPreset {
  id: string;
  label: string;
  emoji?: string;
  icon?: string;
  description: string;
  profile: UserProfile;
  city: string;
}

export interface TimeWindow {
  timeWindow: string;
  recommendation: string;
  actions: string[];
  maskRequired: boolean;
  outdoorSafe: boolean;
}

export interface GuidanceData {
  summary: {
    alertLevel: AlertLevel;
    headline: string;
    mainRisk: string;
  };
  routinePlanner: {
    morning: TimeWindow;
    afternoon: TimeWindow;
    evening: TimeWindow;
    commuteAdvice: string;
    errandBundling: string;
  };
  indoorAQ: {
    windowStrategy: string;
    purifierAdvice: string;
    zeroCostTips: string[];
    kitchenTips: string[];
    plantSuggestions: string[];
  };
  sustainableAlternatives: {
    action: string;
    category: string;
    healthImpact: string;
    envImpact: string;
    difficulty: 'easy' | 'medium' | 'hard';
    urgency: 'today' | 'this-week' | 'long-term';
  }[];
  vulnerableGroupAlerts: {
    children: string | null;
    seniors: string | null;
    respiratory: string | null;
  };
}

export interface GuidanceResponse {
  status: 'ok' | 'demo';
  data: GuidanceData;
  source: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  followUps?: string[];
}

export interface StationSearchResult {
  uid: number;
  name: string;
  aqi: number | string;
  time?: string;
  city?: string;
  isIndia?: boolean;
}
