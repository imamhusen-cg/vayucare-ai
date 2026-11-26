import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { AQIData, UserProfile, GuidanceData, ChatMessage } from '../types';
import { fetchAQI, fetchStationByUid, fetchAQIByGeo } from '../services/aqiService';
import { fetchGuidance } from '../services/geminiService';
import { DEMO_PRESETS } from '../constants/presets';

interface AppState {
  profile: UserProfile;
  aqiData: AQIData | null;
  guidanceData: GuidanceData | null;
  guidanceSource: string;
  chatMessages: ChatMessage[];
  isLoadingAQI: boolean;
  isLoadingGuidance: boolean;
  isLocating: boolean;
  aqiError: string | null;
  guidanceError: string | null;
  activeTab: 'routine' | 'indoor' | 'sustainable';
  chatOpen: boolean;
}

interface AppContextType extends AppState {
  setProfile: (profile: UserProfile) => void;
  loadPreset: (presetId: string) => void;
  refreshAQI: () => void;
  selectStation: (uid: number, stationCity?: string) => Promise<void>;
  selectCurrentLocation: () => Promise<void>;
  addChatMessage: (msg: ChatMessage) => void;
  setActiveTab: (tab: 'routine' | 'indoor' | 'sustainable') => void;
  setChatOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'vayucare_profile';

const defaultProfile: UserProfile = {
  city: 'Delhi',
  hasKids: false,
  hasSenior: false,
  hasRespiratoryIssues: false,
  commuteMode: 'Car',
  hasAirPurifier: false,
};

function loadSavedProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultProfile;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object') return defaultProfile;
    return {
      city: typeof parsed.city === 'string' && parsed.city.trim() ? parsed.city : defaultProfile.city,
      hasKids: Boolean(parsed.hasKids),
      hasSenior: Boolean(parsed.hasSenior),
      hasRespiratoryIssues: Boolean(parsed.hasRespiratoryIssues),
      commuteMode: typeof parsed.commuteMode === 'string' && parsed.commuteMode ? parsed.commuteMode : defaultProfile.commuteMode,
      hasAirPurifier: Boolean(parsed.hasAirPurifier),
    };
  } catch {
    return defaultProfile;
  }
}

function persistProfile(profile: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota or private-mode restrictions
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(loadSavedProfile);
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [guidanceData, setGuidanceData] = useState<GuidanceData | null>(null);
  const [guidanceSource, setGuidanceSource] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingAQI, setIsLoadingAQI] = useState(false);
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [aqiError, setAqiError] = useState<string | null>(null);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'routine' | 'indoor' | 'sustainable'>('routine');
  const [chatOpen, setChatOpen] = useState(false);

  const profileRef = useRef(profile);
  profileRef.current = profile;

  // Monotonic request IDs and AbortControllers prevent stale responses and race conditions
  const aqiReqIdRef = useRef(0);
  const guidanceReqIdRef = useRef(0);
  const aqiAbortRef = useRef<AbortController | null>(null);
  const guidanceAbortRef = useRef<AbortController | null>(null);
  // Prevents city-change effect from overwriting an explicit station or GPS selection
  const skipNextCityFetchRef = useRef(false);
  // Prevents profile-options effect from firing a redundant guidance call on the same render as a city change
  const lastFetchedCityRef = useRef<string | null>(null);

  const loadGuidance = useCallback(async (targetProfile: UserProfile, data: AQIData, silentError = false) => {
    guidanceAbortRef.current?.abort();
    const controller = new AbortController();
    guidanceAbortRef.current = controller;
    const reqId = ++guidanceReqIdRef.current;

    setIsLoadingGuidance(true);
    if (!silentError) setGuidanceError(null);

    try {
      const guidance = await fetchGuidance(targetProfile, data, controller.signal);
      if (reqId !== guidanceReqIdRef.current) return;
      setGuidanceData(guidance.data);
      setGuidanceSource(guidance.source);
      setGuidanceError(null);
    } catch (err) {
      if (isAbortError(err) || reqId !== guidanceReqIdRef.current) return;
      if (!silentError) {
        setGuidanceError('Failed to load AI guidance.');
      }
    } finally {
      if (reqId === guidanceReqIdRef.current) {
        setIsLoadingGuidance(false);
      }
    }
  }, []);

  const refreshAQI = useCallback(async () => {
    const activeProfile = profileRef.current;
    aqiAbortRef.current?.abort();
    const controller = new AbortController();
    aqiAbortRef.current = controller;
    const reqId = ++aqiReqIdRef.current;

    setIsLoadingAQI(true);
    setAqiError(null);
    lastFetchedCityRef.current = activeProfile.city;

    try {
      const data = await fetchAQI(activeProfile.city, controller.signal);
      if (reqId !== aqiReqIdRef.current) return;
      setAqiData(data);
      await loadGuidance(profileRef.current, data);
    } catch (err) {
      if (isAbortError(err) || reqId !== aqiReqIdRef.current) return;
      setAqiError('Could not load AQI data. Showing estimated values.');
    } finally {
      if (reqId === aqiReqIdRef.current) {
        setIsLoadingAQI(false);
      }
    }
  }, [loadGuidance]);

  const selectStation = useCallback(async (uid: number, stationCity?: string) => {
    aqiAbortRef.current?.abort();
    const controller = new AbortController();
    aqiAbortRef.current = controller;
    const reqId = ++aqiReqIdRef.current;

    setIsLoadingAQI(true);
    setAqiError(null);

    try {
      const data = await fetchStationByUid(uid, controller.signal);
      if (reqId !== aqiReqIdRef.current) return;

      setAqiData(data);
      const currentProfile = profileRef.current;
      const newCity = stationCity || data.city || currentProfile.city;
      const nextProfile = newCity && newCity !== currentProfile.city
        ? { ...currentProfile, city: newCity }
        : currentProfile;

      if (nextProfile !== currentProfile) {
        skipNextCityFetchRef.current = true;
        lastFetchedCityRef.current = newCity;
        setProfileState(nextProfile);
        persistProfile(nextProfile);
      }

      await loadGuidance(nextProfile, data);
    } catch (err) {
      if (isAbortError(err) || reqId !== aqiReqIdRef.current) return;
      setAqiError('Could not load station data.');
    } finally {
      if (reqId === aqiReqIdRef.current) {
        setIsLoadingAQI(false);
      }
    }
  }, [loadGuidance]);

  const selectCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setAqiError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setIsLoadingAQI(true);
    setAqiError(null);

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          aqiAbortRef.current?.abort();
          const controller = new AbortController();
          aqiAbortRef.current = controller;
          const reqId = ++aqiReqIdRef.current;

          try {
            const { latitude, longitude } = position.coords;
            const data = await fetchAQIByGeo(latitude, longitude, controller.signal);
            if (reqId !== aqiReqIdRef.current) {
              resolve();
              return;
            }

            setAqiData(data);
            const currentProfile = profileRef.current;
            const newCity = data.city || currentProfile.city;
            const nextProfile = newCity !== currentProfile.city
              ? { ...currentProfile, city: newCity }
              : currentProfile;

            if (nextProfile !== currentProfile) {
              skipNextCityFetchRef.current = true;
              lastFetchedCityRef.current = newCity;
              setProfileState(nextProfile);
              persistProfile(nextProfile);
            }

            await loadGuidance(nextProfile, data);
            resolve();
          } catch (err: unknown) {
            if (isAbortError(err) || reqId !== aqiReqIdRef.current) {
              resolve();
              return;
            }
            const msg = err instanceof Error ? err.message : 'Could not fetch air quality for your location.';
            setAqiError(msg);
            reject(err);
          } finally {
            setIsLocating(false);
            if (reqId === aqiReqIdRef.current) {
              setIsLoadingAQI(false);
            }
          }
        },
        (error) => {
          setIsLocating(false);
          setIsLoadingAQI(false);
          let message = 'Location access was denied.';
          if (error.code === error.TIMEOUT) message = 'Location request timed out.';
          if (error.code === error.POSITION_UNAVAILABLE) message = 'Location information unavailable.';
          setAqiError(message);
          reject(new Error(message));
        },
        { timeout: 12000, enableHighAccuracy: true }
      );
    });
  }, [loadGuidance]);

  const setProfile = useCallback((newProfile: UserProfile) => {
    setProfileState(newProfile);
    persistProfile(newProfile);
  }, []);

  const loadPreset = useCallback((presetId: string) => {
    const preset = DEMO_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setProfile(preset.profile);
    }
  }, [setProfile]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  // Load AQI on mount and whenever city changes via search/quick-chip/preset
  useEffect(() => {
    if (skipNextCityFetchRef.current) {
      skipNextCityFetchRef.current = false;
      return;
    }
    refreshAQI();
  }, [profile.city, refreshAQI]);

  // Update AI guidance when non-city household/commute options change (only if city didn't also just change)
  useEffect(() => {
    if (!aqiData || lastFetchedCityRef.current !== profile.city) return;
    loadGuidance(profileRef.current, aqiData, true);
  }, [
    profile.hasKids,
    profile.hasSenior,
    profile.hasRespiratoryIssues,
    profile.commuteMode,
    profile.hasAirPurifier,
    loadGuidance,
  ]);

  // Abort any pending requests on unmount
  useEffect(() => {
    return () => {
      aqiAbortRef.current?.abort();
      guidanceAbortRef.current?.abort();
    };
  }, []);

  const value = useMemo<AppContextType>(() => ({
    profile,
    aqiData,
    guidanceData,
    guidanceSource,
    chatMessages,
    isLoadingAQI,
    isLoadingGuidance,
    isLocating,
    aqiError,
    guidanceError,
    activeTab,
    chatOpen,
    setProfile,
    loadPreset,
    refreshAQI,
    selectStation,
    selectCurrentLocation,
    addChatMessage,
    setActiveTab,
    setChatOpen,
  }), [
    profile,
    aqiData,
    guidanceData,
    guidanceSource,
    chatMessages,
    isLoadingAQI,
    isLoadingGuidance,
    isLocating,
    aqiError,
    guidanceError,
    activeTab,
    chatOpen,
    setProfile,
    loadPreset,
    refreshAQI,
    selectStation,
    selectCurrentLocation,
    addChatMessage,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
