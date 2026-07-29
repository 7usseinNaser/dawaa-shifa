import { useEffect, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';

/**
 * ExitIntent — modal that appears when mouse leaves to top (desktop only).
 * Encourages joining the waitlist before leaving.
 */
export default function ExitIntent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('dawaa-exit')) return;

    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setShow(true);
        sessionStorage.setItem('dawaa-exit', '1');
        document.removeEventListener('mouseout', onLeave);
      }
    };
    document.addEventListener('mouseout', onLeave);
    return () => document.removeEventListener('mouseout', onLeave);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShow(false)}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative glass-card p-8 max-w-md text-center animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => setShow(false)} className="absolute top-4 left-4 p-2 rounded-full glass hover:bg-status-emergency/20">
          <X className="w-4 h-4" />
        </button>
        <div className="text-5xl mb-4">🤍</div>
        <h3 className="font-cairo font-black text-2xl mb-3">قبل أن تغادر...</h3>
        <p className="font-tajawal text-[var(--text-soft)] mb-6">
          انضم لقائمة الانتظار وسنخبرك فور إطلاق التطبيق. كل ثانية تهم — وكل منضم يساعد.
        </p>
        <a href="#waitlist" onClick={() => setShow(false)} className="btn-primary inline-flex items-center gap-2 group">
          <span>انضم الآن</span>
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        </a>
      </div>
    </div>
  );
}
