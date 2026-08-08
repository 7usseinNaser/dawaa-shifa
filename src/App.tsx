import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AccessibilityPanel from '@/components/AccessibilityPanel';
import OfflineIndicator from '@/components/OfflineIndicator';
import AuthPage from '@/components/AuthPage';
import BackToTop from '@/components/BackToTop';
import Comparison from '@/components/Comparison';
import DonatePage from '@/components/DonatePage';
import CustomCursor from '@/components/CustomCursor';
import ExitIntent from '@/components/ExitIntent';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import InteractiveDemo from '@/components/InteractiveDemo';
import LiquidBackground from '@/components/LiquidBackground';
import Navbar from '@/components/Navbar';
import ResetPasswordForm from '@/components/ResetPasswordForm';
import ScrollProgress from '@/components/ScrollProgress';
import SocialShare from '@/components/SocialShare';
import TeamPage from '@/components/TeamPage';
import ProblemSolutionSection from '@/components/sections/ProblemSolutionSection';
import ImpactSection from '@/components/sections/ImpactSection';
import SupportSection from '@/components/sections/SupportSection';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LanguageProvider } from '@/lib/i18n';
import { useTheme } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionBoundary } from '@/components/ui/SectionBoundary';
import NotificationBanner from '@/components/NotificationBanner';

const CitizenDashboard = lazy(() => import('@/components/CitizenDashboard'));
const PharmacistDashboard = lazy(() => import('@/components/PharmacistDashboard'));
const FacilityDashboard = lazy(() => import('@/components/FacilityDashboard'));
const AdminPanel = lazy(() => import('@/components/AdminPanel'));

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full"
      />
    </div>
  );
}

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: EASE } },
};

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onHash = () => { setHash(window.location.hash); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return hash;
}

function AppContent() {
  const { theme, toggle } = useTheme();
  const { user, profile, loading, profileLoading, isRecovery, clearRecovery } = useAuth();
  const hash = useHashRoute();

  const currentRoute = hash.split('?')[0];
  const isAuthRoute = currentRoute === '#/auth' || currentRoute === '#/login' || currentRoute === '#/register';
  const isDashboardRoute = currentRoute === '#/dashboard';
  const isDonateRoute = currentRoute === '#/donate' || hash.startsWith('#/donate');
  const isTeamRoute = currentRoute === '#/team';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LiquidBackground />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full relative z-10"
        />
      </div>
    );
  }

  if (isRecovery) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="reset" variants={pageVariants} initial="initial" animate="enter" exit="exit">
          <ResetPasswordForm
            onSuccess={() => {
              clearRecovery();
              window.location.hash = '#/auth';
            }}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (isAuthRoute) {
    if (user && profile) {
      window.location.hash = '#/dashboard';
      return null;
    }
    if (user && profileLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <LiquidBackground />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full relative z-10"
          />
        </div>
      );
    }
    return (
      <AnimatePresence mode="wait">
        <motion.div key="auth" variants={pageVariants} initial="initial" animate="enter" exit="exit">
          <AuthPage />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (isDonateRoute) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="donate" variants={pageVariants} initial="initial" animate="enter" exit="exit">
          <DonatePage />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (isTeamRoute) {
    return (
      <AnimatePresence mode="wait">
        <motion.div key="team" variants={pageVariants} initial="initial" animate="enter" exit="exit">
          <TeamPage />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (isDashboardRoute) {
    if (!user) {
      window.location.hash = '#/auth';
      return null;
    }
    if (user && !profile && profileLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <LiquidBackground />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full relative z-10"
          />
        </div>
      );
    }
    if (user && !profile) {
      window.location.hash = '#/auth';
      return null;
    }
    const p = profile!;
    const AUTHORIZED_ADMIN = 'hussein7.7naser@gmail.com';
    if (p.role === 'admin' && user.email !== AUTHORIZED_ADMIN) {
      window.location.hash = '#/auth';
      return null;
    }
    return (
      <AnimatePresence mode="wait">
        <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="enter" exit="exit">
          <Suspense fallback={<LazyFallback />}>
            {p.role === 'citizen' && <CitizenDashboard theme={theme} onToggleTheme={toggle} />}
            {p.role === 'pharmacist' && <PharmacistDashboard theme={theme} onToggleTheme={toggle} />}
            {p.role === 'facility_owner' && <FacilityDashboard theme={theme} onToggleTheme={toggle} />}
            {p.role === 'admin' && <AdminPanel />}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Landing page: 5 merged sections ──
  return (
    <div className="min-h-screen text-[var(--text-main)] selection:bg-brand-green/30">
      <LiquidBackground />
      <OfflineIndicator />
      <NotificationBanner />
      <ScrollProgress />
      <CustomCursor />
      <BackToTop />
      <SocialShare />
      <AccessibilityPanel />
      <ExitIntent />
      <Navbar theme={theme} onToggleTheme={toggle} />

      <main className="relative z-10">
        {/* 1 — Hero */}
        <SectionBoundary name="hero"><Hero /></SectionBoundary>

        {/* 2 — Problem → Solution (merged) */}
        <ProblemSolutionSection />

        {/* How It Works — restored as standalone section */}
        <SectionBoundary name="how"><HowItWorks /></SectionBoundary>

        {/* 3 — Interactive Demo + Comparison */}
        <InteractiveDemo />
        <Comparison />

        {/* 4 — Impact (metrics + live feed strip + testimonials + stories + use cases + users) */}
        <ImpactSection />

        {/* 5 — Support (donation + privacy + FAQ) */}
        <SupportSection />
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
