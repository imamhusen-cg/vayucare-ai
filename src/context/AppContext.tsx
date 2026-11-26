import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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

const defaultProfile: UserProfile = {
  city: 'Delhi',
  hasKids: false,
  hasSenior: false,
  hasRespiratoryIssues: false,
  commuteMode: 'Car',
  hasAirPurifier: false,
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('vayucare_profile');
      return saved ? JSON.parse(saved) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

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

  const refreshAQI = useCallback(async () => {
    setIsLoadingAQI(true);
    setAqiError(null);
    try {
      const data = await fetchAQI(profile.city);
      setAqiData(data);
      // Auto-fetch guidance when AQI refreshes
      setIsLoadingGuidance(true);
      setGuidanceError(null);
      try {
        const guidance = await fetchGuidance(profile, data);
        setGuidanceData(guidance.data);
        setGuidanceSource(guidance.source);
      } catch {
        setGuidanceError('Failed to load AI guidance. Retrying...');
      } finally {
        setIsLoadingGuidance(false);
      }
    } catch {
      setAqiError('Could not load AQI data. Showing estimated values.');
    } finally {
      setIsLoadingAQI(false);
    }
  }, [profile]);

  const selectStation = useCallback(async (uid: number, stationCity?: string) => {
    setIsLoadingAQI(true);
    setAqiError(null);
    try {
      const data = await fetchStationByUid(uid);
      setAqiData(data);
      const newCity = stationCity || data.city || profile.city;
      if (newCity && newCity !== profile.city) {
        setProfileState(prev => {
          const updated = { ...prev, city: newCity };
          localStorage.setItem('vayucare_profile', JSON.stringify(updated));
          return updated;
        });
      }
      setIsLoadingGuidance(true);
      try {
        const guidance = await fetchGuidance({ ...profile, city: newCity }, data);
        setGuidanceData(guidance.data);
        setGuidanceSource(guidance.source);
      } catch {
        setGuidanceError('Failed to load AI guidance.');
      } finally {
        setIsLoadingGuidance(false);
      }
    } catch {
      setAqiError('Could not load station data.');
    } finally {
      setIsLoadingAQI(false);
    }
  }, [profile]);

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
          try {
            const { latitude, longitude } = position.coords;
            const data = await fetchAQIByGeo(latitude, longitude);
            setAqiData(data);
            const newCity = data.city || profile.city;
            setProfileState(prev => {
              const updated = { ...prev, city: newCity };
              localStorage.setItem('vayucare_profile', JSON.stringify(updated));
              return updated;
            });
            setIsLoadingGuidance(true);
            try {
              const guidance = await fetchGuidance({ ...profile, city: newCity }, data);
              setGuidanceData(guidance.data);
              setGuidanceSource(guidance.source);
            } catch {
              setGuidanceError('Failed to load AI guidance for location.');
            } finally {
              setIsLoadingGuidance(false);
            }
            resolve();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Could not fetch air quality for your location.';
            setAqiError(message);
            reject(err);
          } finally {
            setIsLocating(false);
            setIsLoadingAQI(false);
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
  }, [profile]);

  const setProfile = useCallback((newProfile: UserProfile) => {
    setProfileState(newProfile);
    localStorage.setItem('vayucare_profile', JSON.stringify(newProfile));
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

  // Load AQI strictly on mount and when city changes (triggers top-right "Syncing...")
  useEffect(() => {
    refreshAQI();
  }, [profile.city]);

  // When local profile/commute options change, update AI guidance silently without triggering top-right "Syncing..."
  useEffect(() => {
    if (!aqiData) return;
    let isCancelled = false;
    setIsLoadingGuidance(true);
    fetchGuidance(profile, aqiData)
      .then(guidance => {
        if (!isCancelled) {
          setGuidanceData(guidance.data);
          setGuidanceSource(guidance.source);
        }
      })
      .catch(() => {
        // Fallback guidance is managed silently
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingGuidance(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [profile.hasKids, profile.hasSenior, profile.hasRespiratoryIssues, profile.commuteMode, profile.hasAirPurifier]);

  return (
    <AppContext.Provider value={{
      profile, aqiData, guidanceData, guidanceSource, chatMessages,
      isLoadingAQI, isLoadingGuidance, isLocating, aqiError, guidanceError,
      activeTab, chatOpen,
      setProfile, loadPreset, refreshAQI, selectStation, selectCurrentLocation,
      addChatMessage, setActiveTab, setChatOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
