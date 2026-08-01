import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, ArrowLeft, Heart, LayoutDashboard, LogIn, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import LanguageToggle from './LanguageToggle';
import { DonationModal } from '@/components/DonationModal';

interface Props {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function Navbar({ theme, onToggleTheme }: Props) {
  const { user, profile, signOut } = useAuth();
  const { t, lang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [showDonate, setShowDonate] = useState(false);

  const handleDonateClick = () => {
    if (user) {
      window.location.hash = '#/donate';
    } else {
      window.location.hash = '#/auth?redirect=/donate';
    }
  };

  const links = [
    { href: '#hero', label: t('nav.home') },
    { href: '#problem', label: lang === 'ar' ? 'المشكلة' : 'Problem' },
    { href: '#solution', label: lang === 'ar' ? 'الحل' : 'Solution' },
    { href: '#how', label: lang === 'ar' ? 'كيف يعمل' : 'How it works' },
    { href: '#users', label: lang === 'ar' ? 'من يستخدمه' : 'Users' },
    { href: '#about', label: lang === 'ar' ? 'المطور' : 'About' },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'glass shadow-lg' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#hero" className="flex items-center gap-2 group">
            <div className="relative">
              <Activity className="w-8 h-8 text-brand-green-light group-hover:rotate-12 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-status-open rounded-full status-pulse" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-cairo font-extrabold text-lg text-[var(--text-main)]">{lang === 'ar' ? 'دواء وشفاء' : 'Dawaa & Shifa'}</span>
              <span className="font-inter text-[10px] text-[var(--text-muted)] tracking-wider">DAWAA & SHIFA</span>
            </div>
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="px-3 py-2 text-sm font-tajawal text-[var(--text-soft)] hover:text-brand-green-light transition-colors rounded-lg hover:bg-[var(--glass)]">
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button onClick={onToggleTheme} className="p-2 rounded-full glass hover:scale-110 transition-transform" aria-label={lang === 'ar' ? 'تبديل الوضع' : 'Toggle theme'}>
              {theme === 'dark' ? <Sun className="w-5 h-5 text-brand-green-light" /> : <Moon className="w-5 h-5 text-brand-blue" />}
            </button>

            <button
              onClick={handleDonateClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full glass hover:bg-brand-green/10 transition-colors text-sm font-tajawal"
              aria-label={lang === 'ar' ? 'تبرّع' : 'Donate'}
            >
              <Heart className="w-4 h-4 text-brand-green-light" />
              <span className="hidden sm:inline font-bold">{lang === 'ar' ? 'تبرّع' : 'Donate'}</span>
            </button>

            {user && profile ? (
              <a href="#/dashboard" className="hidden sm:inline-flex btn-primary text-sm items-center gap-1.5 group">
                <LayoutDashboard className="w-4 h-4" /> {t('nav.dashboard')}
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </a>
            ) : (
              <a href="#/auth" className="hidden sm:inline-flex btn-primary text-sm items-center gap-1.5 group">
                <LogIn className="w-4 h-4" /> {t('nav.login')}
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </a>
            )}

            <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-full glass" aria-label={lang === 'ar' ? 'القائمة' : 'Menu'}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden glass border-t border-[var(--border-subtle)] overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block px-4 py-3 rounded-xl text-[var(--text-soft)] hover:bg-[var(--glass)] hover:text-brand-green-light transition-colors font-tajawal">
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => { handleDonateClick(); setOpen(false); }}
                className="block w-full text-center px-4 py-3 rounded-xl glass hover:bg-brand-green/10 transition-colors font-tajawal flex items-center gap-2 justify-center"
              >
                <Heart className="w-5 h-5 text-brand-green-light" />
                {lang === 'ar' ? 'تبرّع' : 'Donate'}
              </button>
              {user && profile ? (
                <a href="#/dashboard" onClick={() => setOpen(false)} className="block btn-primary text-center mt-2">{t('nav.dashboard')}</a>
              ) : (
                <a href="#/auth" onClick={() => setOpen(false)} className="block btn-primary text-center mt-2">{t('nav.login')}</a>
              )}
              {user && profile && (
                <button
                  onClick={() => { signOut(); setOpen(false); }}
                  className="block w-full text-center px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors font-tajawal flex items-center gap-2 justify-center mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  {t('nav.logout')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>

    <DonationModal open={showDonate} onClose={() => setShowDonate(false)} />
    </>
  );
}
