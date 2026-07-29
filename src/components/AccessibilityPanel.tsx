import { useEffect, useState } from 'react';
import { Eye, RotateCcw, Type, Zap, X } from 'lucide-react';

interface Settings {
  fontScale: number;
  highContrast: boolean;
  reduceMotion: boolean;
  biggerTargets: boolean;
}

const defaults: Settings = {
  fontScale: 100,
  highContrast: false,
  reduceMotion: false,
  biggerTargets: false,
};

/**
 * AccessibilityPanel — floating settings for elderly/accessibility needs.
 * Adjusts font scale, contrast, motion, and touch targets live.
 */
export default function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaults);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${settings.fontScale}%`;
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('reduce-motion', settings.reduceMotion);
    root.classList.toggle('big-touch', settings.biggerTargets);
  }, [settings]);

  const reset = () => setSettings(defaults);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full glass-card flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="إعدادات الوصول"
      >
        <Eye className="w-5 h-5 text-brand-green-light" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 left-6 z-40 w-72 glass-card p-5 animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-cairo font-bold text-sm">إعدادات الوصول</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-[var(--glass)]">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Font scale */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-tajawal flex items-center gap-1.5"><Type className="w-4 h-4" /> حجم الخط</span>
              <span className="text-sm font-inter font-bold text-brand-green-light">{settings.fontScale}%</span>
            </div>
            <input
              type="range" min={80} max={150} step={10}
              value={settings.fontScale}
              onChange={(e) => setSettings({ ...settings, fontScale: Number(e.target.value) })}
              className="w-full accent-brand-green"
              aria-label="حجم الخط"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3">
            {([
              { key: 'highContrast', label: 'تباين عالٍ', icon: Eye },
              { key: 'reduceMotion', label: 'تقليل الحركة', icon: RotateCcw },
              { key: 'biggerTargets', label: 'أهداف لمس أكبر', icon: Zap },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setSettings({ ...settings, [t.key]: !settings[t.key] })}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--glass)] transition-colors"
              >
                <span className="text-sm font-tajawal flex items-center gap-2">
                  <t.icon className="w-4 h-4 text-brand-green-light" /> {t.label}
                </span>
                <span className={`w-10 h-5 rounded-full transition-colors relative ${settings[t.key] ? 'bg-brand-green' : 'bg-[var(--border-subtle)]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings[t.key] ? 'right-0.5' : 'right-5'}`} />
                </span>
              </button>
            ))}
          </div>

          <button onClick={reset} className="w-full mt-4 text-xs font-tajawal text-[var(--text-muted)] hover:text-brand-green-light transition-colors">
            إعادة التعيين
          </button>
        </div>
      )}
    </>
  );
}
