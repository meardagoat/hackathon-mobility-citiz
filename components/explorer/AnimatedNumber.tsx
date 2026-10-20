'use client';
import React, { useEffect, useRef, useState } from 'react';

// Nombre qui glisse vers sa nouvelle valeur (easing exponentiel)
export function useAnimatedValue(cible: number, duree = 900): number {
  const [valeur, setValeur] = useState(cible);
  const depart = useRef(cible);
  const courante = useRef(cible);
  useEffect(() => {
    depart.current = courante.current;
    const t0 = performance.now();
    let id = 0;
    const pas = (t: number) => {
      const p = Math.min(1, (t - t0) / duree);
      const e = 1 - Math.pow(2, -10 * p);
      courante.current = depart.current + (cible - depart.current) * (p === 1 ? 1 : e);
      setValeur(courante.current);
      if (p < 1) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [cible, duree]);
  return valeur;
}

export function AnimatedNumber({ value, format, duration }: { value: number; format: (n: number) => string; duration?: number }) {
  const v = useAnimatedValue(value, duration);
  return <span className="tabular-nums">{format(v)}</span>;
}
