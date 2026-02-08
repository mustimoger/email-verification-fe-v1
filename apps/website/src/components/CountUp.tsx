"use client";

import { useEffect, useRef, useState } from "react";

type CountUpProps = {
  to: number;
  duration?: number;
  className?: string;
  respectReducedMotion?: boolean;
};

export function CountUp({
  to,
  duration = 2400,
  className,
  respectReducedMotion = true,
}: CountUpProps) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const lastValueRef = useRef(0);

  useEffect(() => {
    if (respectReducedMotion) {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) {
        setValue(to);
        return;
      }
    }

    lastValueRef.current = 0;
    startRef.current = null;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const next = Math.round(easeOutCubic(progress) * to);

      if (next !== lastValueRef.current) {
        lastValueRef.current = next;
        setValue(next);
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [to, duration]);

  return <span className={className}>{value}</span>;
}
