import { useEffect, useState } from 'react';

/**
 * CustomCursor — dot + ring that follow mouse.
 * Hidden on touch devices.
 */
export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [ringPos, setRingPos] = useState({ x: -100, y: -100 });
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if ('ontouchstart' in window) return;

    const onMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement;
      setHovering(
        !!target.closest('a, button, input, [role="button"], .cursor-hover')
      );
    };

    let raf = 0;
    const onMoveRaf = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => onMove(e));
    };
    window.addEventListener('mousemove', onMoveRaf);
    return () => {
      window.removeEventListener('mousemove', onMoveRaf);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if ('ontouchstart' in window) return;
    let raf = 0;
    const animate = () => {
      setRingPos((prev) => ({
        x: prev.x + (pos.x - prev.x) * 0.15,
        y: prev.y + (pos.y - prev.y) * 0.15,
      }));
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, [pos]);

  if ('ontouchstart' in window) return null;

  return (
    <>
      <div
        className="cursor-dot"
        style={{ transform: `translate(${pos.x - 4}px, ${pos.y - 4}px)` }}
      />
      <div
        className="cursor-ring"
        style={{
          transform: `translate(${ringPos.x - 18}px, ${ringPos.y - 18}px) scale(${hovering ? 1.5 : 1})`,
          borderColor: hovering ? 'rgba(29, 158, 117, 0.8)' : 'rgba(29, 158, 117, 0.5)',
        }}
      />
    </>
  );
}
