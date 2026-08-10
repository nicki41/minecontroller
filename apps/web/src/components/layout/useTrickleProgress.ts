import { useEffect, useRef, useState } from "react";

/**
 * Turns a boolean "is something loading" signal into a smooth 0..1 progress
 * value for LoadingLogo, NProgress-style: trickles toward (never reaching)
 * an asymptote while active, snaps to 1 the instant it's not, then stays
 * visible for a short fade window so the completion isn't an abrupt cut.
 */
const TRICKLE_ASYMPTOTE = 0.92;
const TRICKLE_TIME_CONSTANT_MS = 500;
const COMPLETE_FADE_MS = 350;

export function useTrickleProgress(active: boolean) {
  const [progress, setProgress] = useState(active ? 0 : 1);
  const [visible, setVisible] = useState(active);
  const rafRef = useRef<number>();
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(fadeTimeoutRef.current);

    if (active) {
      setVisible(true);
      setProgress(0);
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        setProgress(TRICKLE_ASYMPTOTE * (1 - Math.exp(-elapsed / TRICKLE_TIME_CONSTANT_MS)));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current!);
    }

    cancelAnimationFrame(rafRef.current!);
    setProgress(1);
    fadeTimeoutRef.current = setTimeout(() => setVisible(false), COMPLETE_FADE_MS);
    return () => clearTimeout(fadeTimeoutRef.current);
  }, [active]);

  return { progress, visible };
}
