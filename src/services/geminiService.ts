import type { UserProfile, AQIData, GuidanceResponse } from '../types';

export async function fetchGuidance(profile: UserProfile, aqiData: AQIData): Promise<GuidanceResponse> {
  const response = await fetch('/api/gemini/guidance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, aqiData }),
  });
  if (!response.ok) throw new Error(`Guidance API error: ${response.status}`);
  return response.json();
}

export async function sendChatMessage(
  question: string,
  profile: UserProfile,
  aqiData: AQIData
): Promise<{ reply: string; followUps?: string[] }> {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, profile, aqiData }),
  });
  if (!response.ok) throw new Error('Chat error');
  const data = await response.json();
  return {
    reply: data.reply || '',
    followUps: Array.isArray(data.suggestedFollowUps) ? data.suggestedFollowUps : undefined
  };
}

export async function generateAdvisory(
  profile: UserProfile, 
  aqiData: AQIData,
  audience: 'rwa' | 'family' | 'school' = 'rwa',
  language: 'en' | 'hi' = 'en'
): Promise<string> {
  const response = await fetch('/api/gemini/advisory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, aqiData, audience, language }),
  });
  if (!response.ok) throw new Error('Advisory error');
  const data = await response.json();
  return data.advisory;
}
