import { useEffect, useRef } from 'react';

/**
 * useMagnetic — element shifts slightly toward cursor when near (desktop).
 */
export function useMagnetic<T extends HTMLElement = HTMLButtonElement>(strength = 0.3) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || 'ontouchstart' in window) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < 100) {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      } else {
        el.style.transform = 'translate(0,0)';
      }
    };
    const onLeave = () => { el.style.transform = 'translate(0,0)'; };

    document.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      document.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength]);

  return ref;
}
