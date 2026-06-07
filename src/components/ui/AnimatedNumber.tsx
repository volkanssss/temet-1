import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
}

/**
 * Bir sayıyı 0'dan (ya da önceki değerden) hedefe kadar
 * ease-out animasyonla sayarak gösterir.
 */
export default function AnimatedNumber({
  value,
  duration = 1100,
  formatter,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef   = useRef(value);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef<number | null>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value === prevValue.current) return;
    const from = prevValue.current;
    prevValue.current = value;
    fromRef.current   = from;
    startRef.current  = null;

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed  = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className={className}>
      {formatter ? formatter(display) : display.toFixed(0)}
    </span>
  );
}
