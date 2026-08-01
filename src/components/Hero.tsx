import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Search, Pill, Activity, Building2 } from 'lucide-react';
import { useLang } from '@/lib/i18n';
import { SearchBar } from '@/components/SearchBar';
import type { Pharmacy } from '@/lib/types';

const samplePharmacies: Pharmacy[] = [
  { id: '1', name: 'صيدلية الشفاء', phone: '0599123456', lat: 31.5017, lng: 34.4668, area: 'غزة', address: 'شارع الجلاء' },
  { id: '2', name: 'صيدلية النور', phone: '0598765432', lat: 31.9522, lng: 35.2332, area: 'رام الله', address: 'شارع المدينة' },
  { id: '3', name: 'صيدلية الأمل', phone: '0592345678', lat: 32.2073, lng: 35.3330, area: 'نابلس', address: 'شارع حطين' },
  { id: '4', name: 'صيدلية القدس', phone: '0593456789', lat: 31.7683, lng: 35.2137, area: 'الخليل', address: 'شارع باب الزاوية' },
  { id: '5', name: 'صيدلية الرحمة', phone: '0594567890', lat: 32.3253, lng: 35.0822, area: 'جنين', address: 'شارع الحارس' },
];

export function Hero({ onLoginClick }: { onLoginClick: () => void }) {
  const { t, isRTL } = useLang();
  const [showSearch, setShowSearch] = useState(false);

  return (
    <section className="relative pt-28 pb-20 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 via-transparent to-brand-blue/10 pointer-events-none" />
      <div className="max-w-4xl mx-auto relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-6"
        >
          <Activity className="w-4 h-4 text-brand-green-light" />
          <span className="text-xs font-bold">{isRTL ? 'منصة فلسطينية لإيجاد الأدوية' : 'Palestinian platform for finding medicines'}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-cairo text-4xl sm:text-5xl font-bold mb-4 leading-tight"
        >
          {isRTL ? 'دواء وشفاء' : 'Dawaa Shifa'}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-tajawal text-lg text-[var(--text-soft)] mb-8 max-w-2xl mx-auto"
        >
          {isRTL
            ? 'منصة تربط المرضى بالأدوية المتوفرة في الصيدليات الفلسطينية — ابحث، اعثر، واحصل على دوائك.'
            : 'A platform connecting patients with available medicines in Palestinian pharmacies — search, find, and get your medicine.'}
        </motion.p>

        {/* Live search experience */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto"
        >
          {!showSearch ? (
            <button
              onClick={() => setShowSearch(true)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              {isRTL ? 'جرّب البحث بنفسك' : 'Try the search yourself'}
            </button>
          ) : (
            <SearchBar pharmacies={samplePharmacies} />
          )}
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap justify-center gap-3 mt-8"
        >
          {[
            { icon: Pill, label: isRTL ? 'بحث الأدوية' : 'Medicine Search' },
            { icon: Building2, label: isRTL ? 'صيدليات معتمدة' : 'Verified Pharmacies' },
            { icon: Heart, label: isRTL ? 'تبرع بالأدوية' : 'Medicine Donation' },
          ].map((f, i) => (
            <div key={i} className="glass rounded-full px-4 py-2 flex items-center gap-2">
              <f.icon className="w-4 h-4 text-brand-green-light" />
              <span className="text-sm font-tajawal">{f.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
