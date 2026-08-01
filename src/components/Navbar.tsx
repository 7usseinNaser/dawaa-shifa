import { useState } from 'react';
import { Menu, X, Moon, Sun, Heart, LogOut } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { DonationModal } from '@/components/DonationModal';

interface NavbarProps {
  onLoginClick: () => void;
}

export function Navbar({ onLoginClick }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { lang, isRTL, setLang, t } = useLang();
  const { profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo + Menu button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-cairo font-bold text-lg hidden sm:block">دواء وشفاء</span>
            </div>
          </div>

          {/* Right actions — ONLY: theme toggle, lang toggle, donate, login/logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors font-tajawal text-sm"
              aria-label="Toggle language"
            >
              {isRTL ? 'EN' : 'ع'}
            </button>
            <button
              onClick={() => setShowDonate(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-green to-brand-green-dark text-white text-sm font-bold flex items-center gap-1.5 hover:shadow-lg hover:shadow-brand-green/30 transition-all"
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav.donate')}</span>
            </button>
            {profile ? (
              <button
                onClick={onLoginClick}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                {t('nav.account')}
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                {t('nav.login')}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className={`absolute top-0 ${isRTL ? 'right-0' : 'left-0'} bottom-0 w-72 glass-card rounded-none p-5 flex flex-col gap-3`}>
            <div className="flex items-center justify-between mb-4">
              <span className="font-cairo font-bold text-lg">دواء وشفاء</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => { setShowDonate(true); setMobileOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-green/10 hover:bg-brand-green/20 transition-colors"
            >
              <Heart className="w-5 h-5 text-brand-green-light" />
              <span className="font-tajawal">{t('nav.donate')}</span>
            </button>
            <button
              onClick={() => { onLoginClick(); setMobileOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
            >
              <span className="font-tajawal">{profile ? t('nav.account') : t('nav.login')}</span>
            </button>
            {profile && (
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-tajawal">{t('nav.logout')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <DonationModal open={showDonate} onClose={() => setShowDonate(false)} />
    </>
  );
}
