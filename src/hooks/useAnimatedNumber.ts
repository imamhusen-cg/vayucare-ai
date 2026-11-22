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
  const [displayValue, setDisplayValue] = useState<number>(target);
  const startValRef = useRef<number>(target);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const targetRef = useRef<number>(target);

  useEffect(() => {
    // If target didn't change, do nothing
    if (target === targetRef.current && displayValue === target) {
      return;
    }

    const startVal = displayValue;
    startValRef.current = startVal;
    targetRef.current = target;
    startTimeRef.current = null;

    if (startVal === target) return;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (target - startVal) * ease;

      const factor = Math.pow(10, decimals);
      const rounded = Math.round(current * factor) / factor;
      setDisplayValue(rounded);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(target);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [target, duration, decimals]);

  return displayValue;
}
