import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Gauge, Users, Timer } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

/**
 * WaitTimeCalculator — interactive tool to estimate waiting time.
 * User adjusts patients count + service rate, gets live estimate with countdown.
 */
export default function WaitTimeCalculator() {
  const { ref, visible } = useReveal();
  const [patients, setPatients] = useState(20);
  const [rate, setRate] = useState(8); // minutes per patient
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const waitMin = useMemo(() => patients * rate, [patients, rate]);
  const hours = Math.floor(waitMin / 60);
  const mins = waitMin % 60;
  const status = waitMin < 20 ? 'open' : waitMin < 60 ? 'busy' : 'emergency';
  const statusLabel = waitMin < 20 ? 'طبيعي' : waitMin < 60 ? 'مزدحم' : 'طوارئ';
  const statusColor = waitMin < 20 ? 'status-open' : waitMin < 60 ? 'status-busy' : 'status-emergency';

  // Live countdown
  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining]);

  const startCountdown = () => {
    setRemaining(waitMin * 60);
    setRunning(true);
  };

  const stopCountdown = () => {
    setRunning(false);
    setRemaining(0);
  };

  const cdHours = Math.floor(remaining / 3600);
  const cdMins = Math.floor((remaining % 3600) / 60);
  const cdSecs = remaining % 60;
  const cdDisplay = `${cdHours > 0 ? String(cdHours).padStart(2, '0') + ':' : ''}${String(cdMins).padStart(2, '0')}:${String(cdSecs).padStart(2, '0')}`;

  return (
    <section className="relative py-24 overflow-hidden">
      <div ref={ref} className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-12 reveal ${visible ? 'visible' : ''}`}>
          <span className="inline-block px-4 py-1.5 rounded-full glass text-sm font-tajawal text-brand-blue-light mb-4">
            أداة تفاعلية
          </span>
          <h2 className="font-cairo font-black text-3xl sm:text-4xl lg:text-5xl mb-4">
            احسب <span className="text-gradient">وقت الانتظار</span>
          </h2>
          <p className="text-[var(--text-soft)] font-tajawal max-w-xl mx-auto">
            جرّب كيف يحسب التطبيق وقت الانتظار المتوقع لكل قسم طبي.
          </p>
        </div>

        <div className={`glass-card p-6 lg:p-8 reveal ${visible ? 'visible' : ''}`}>
          {/* Controls */}
          <div className="space-y-6 mb-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-tajawal flex items-center gap-1.5"><Users className="w-4 h-4 text-brand-green-light" /> عدد المنتظرين</span>
                <span className="font-inter font-bold text-lg text-brand-green-light">{patients}</span>
              </div>
              <input type="range" min={1} max={60} value={patients} onChange={(e) => setPatients(Number(e.target.value))} className="w-full accent-brand-green" aria-label="عدد المنتظرين" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-tajawal flex items-center gap-1.5"><Clock className="w-4 h-4 text-brand-blue-light" /> دقائق لكل مريض</span>
                <span className="font-inter font-bold text-lg text-brand-blue-light">{rate} د</span>
              </div>
              <input type="range" min={3} max={20} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-brand-blue" aria-label="دقائق لكل مريض" />
            </div>
          </div>

          {/* Result gauge */}
          <div className="text-center glass rounded-2xl p-6">
            <Gauge className={`w-12 h-12 mx-auto mb-3 text-${statusColor}`} />
            <div className="counter text-5xl text-gradient-green mb-2">
              {hours > 0 ? `${hours}س ` : ''}{mins}د
            </div>
            <div className={`text-sm font-bold px-3 py-1 rounded-full inline-block bg-${statusColor}/20 text-${statusColor}`}>
              {statusLabel}
            </div>
            <p className="text-sm font-tajawal text-[var(--text-muted)] mt-3">
              الوقت المتوقع للفراغ: {hours > 0 ? `${hours} ساعة و ` : ''}{mins} دقيقة
            </p>
          </div>

          {/* Live Countdown */}
          <div className="mt-6 glass rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Timer className={`w-5 h-5 ${running ? 'text-brand-green animate-pulse' : 'text-[var(--text-muted)]'}`} />
              <span className="text-sm font-tajawal font-bold">
                {running ? 'العد التنازلي الحي' : 'العد التنازلي'}
              </span>
            </div>
            {remaining > 0 ? (
              <div className="counter text-4xl text-gradient-green mb-3 font-mono">{cdDisplay}</div>
            ) : (
              <div className="text-2xl text-[var(--text-muted)] mb-3 font-tajawal">
                {running ? 'انتهى الوقت' : 'اضغط لبدء العد التنازلي'}
              </div>
            )}
            <div className="flex gap-2 justify-center">
              {!running ? (
                <button onClick={startCountdown} className="btn-primary text-sm px-4 py-2">
                  ابدأ العد التنازلي
                </button>
              ) : (
                <button onClick={stopCountdown} className="btn-secondary text-sm px-4 py-2">
                  إيقاف
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
