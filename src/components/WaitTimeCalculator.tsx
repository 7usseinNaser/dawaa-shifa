import { useMemo, useState } from 'react';
import { Clock, Gauge, Users } from 'lucide-react';
import { useReveal } from '@/hooks/useReveal';

/**
 * WaitTimeCalculator — interactive tool to estimate waiting time.
 * User adjusts patients count + service rate, gets live estimate.
 */
export default function WaitTimeCalculator() {
  const { ref, visible } = useReveal();
  const [patients, setPatients] = useState(20);
  const [rate, setRate] = useState(8); // minutes per patient

  const waitMin = useMemo(() => patients * rate, [patients, rate]);
  const hours = Math.floor(waitMin / 60);
  const mins = waitMin % 60;
  const status = waitMin < 20 ? 'open' : waitMin < 60 ? 'busy' : 'emergency';
  const statusLabel = waitMin < 20 ? 'طبيعي' : waitMin < 60 ? 'مزدحم' : 'طوارئ';
  const statusColor = waitMin < 20 ? 'status-open' : waitMin < 60 ? 'status-busy' : 'status-emergency';

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
        </div>
      </div>
    </section>
  );
}
