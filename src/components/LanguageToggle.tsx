import { Globe } from 'lucide-react';
import { useLang } from '@/lib/i18n';

export default function LanguageToggle() {
  const { lang, toggle } = useLang();

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 py-2 rounded-full glass hover:bg-brand-green/10 transition-colors text-sm font-tajawal"
      aria-label="Switch language"
    >
      <Globe className="w-4 h-4 text-brand-green-light" />
      <span className="font-inter font-bold">{lang === 'ar' ? 'EN' : 'ع'}</span>
    </button>
  );
}
