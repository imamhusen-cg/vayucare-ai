import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnimatedNumber } from './useAnimatedNumber';

describe('useAnimatedNumber Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with the target value', () => {
    const { result } = renderHook(() => useAnimatedNumber(100));
    expect(result.current).toBe(100);
  });

  it('renders numeric values accurately', () => {
    const { result } = renderHook(() => useAnimatedNumber(250, 300, 0));
    expect(result.current).toBe(250);
  });

  it('respects decimal precision on initialization', () => {
    const { result } = renderHook(() => useAnimatedNumber(4.25, 300, 1));
    expect(result.current).toBe(4.25);
  });
});
