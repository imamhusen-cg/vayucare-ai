import { useState, useEffect, useRef } from 'react';

/**
 * Smoothly animates numeric transitions over `duration` ms (default 350ms)
 * using an easeOutCubic curve and requestAnimationFrame.
 */
export function useAnimatedNumber(
  target: number,
  duration: number = 350,
  decimals: number = 0
): number {
  const safeTarget = Number.isFinite(target) ? target : 0;
  const [displayValue, setDisplayValue] = useState<number>(safeTarget);
  const currentValRef = useRef<number>(safeTarget);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return;

    const startVal = currentValRef.current;
    if (startVal === target) return;

    if (duration <= 0) {
      currentValRef.current = target;
      setDisplayValue(target);
      return;
    }

    startTimeRef.current = null;
    const factor = Math.pow(10, decimals);

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * ease;
      const rounded = Math.round(current * factor) / factor;

      if (rounded !== currentValRef.current) {
        currentValRef.current = rounded;
        setDisplayValue(rounded);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (currentValRef.current !== target) {
          currentValRef.current = target;
          setDisplayValue(target);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [target, duration, decimals]);

  return displayValue;
}
