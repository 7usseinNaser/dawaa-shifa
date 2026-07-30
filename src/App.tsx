import { lazy, Suspense, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import About from '@/components/About';
import AccessibilityPanel from '@/components/AccessibilityPanel';
import OfflineIndicator from '@/components/OfflineIndicator';
import AppPreview from '@/components/AppPreview';
import AuthPage from '@/components/AuthPage';
import BackToTop from '@/components/BackToTop';
import CommunityStories from '@/components/CommunityStories';
import Comparison from '@/components/Comparison';
import CustomCursor from '@/components/CustomCursor';
import ExitIntent from '@/components/ExitIntent';
import FAQ from '@/components/FAQ';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import ImpactMetrics from '@/components/ImpactMetrics';
import InteractiveDemo from '@/components/InteractiveDemo';
import LiveFeed from '@/components/LiveFeed';
import LiveMap from '@/components/LiveMap';
import Navbar from '@/components/Navbar';
import Onboarding from '@/components/Onboarding';
import ResetPasswordForm from '@/components/ResetPasswordForm';
import PrivacySecurity from '@/components/PrivacySecurity';
import Problem from '@/components/Problem';
import Roadmap from '@/components/Roadmap';
import ScrollProgress from '@/components/ScrollProgress';
import SocialShare from '@/components/SocialShare';
import Solution from '@/components/Solution';
import StatsDashboard from '@/components/StatsDashboard';
import TechStack from '@/components/TechStack';
import Testimonials from '@/components/Testimonials';
import UseCases from '@/components/UseCases';
import Users from '@/components/Users';
import WaitTimeCalculator from '@/components/WaitTimeCalculator';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LanguageProvider } from '@/lib/i18n';
import { useTheme } from '@/hooks/useTheme';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const CitizenDashboard = lazy(() => import('@/components/CitizenDashboard'));
const PharmacistDashboard = lazy(() => import('@/components/PharmacistDashboard'));
const FacilityDashboard = lazy(() => import('@/components/FacilityDashboard'));
const AdminPanel = lazy(() => import('@/components/AdminPanel'));

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-dark)]">
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
  const { user, profile, loading, isRecovery, clearRecovery } = useAuth();
  const hash = useHashRoute();

  const isAuthRoute = hash === '#/auth' || hash === '#/login' || hash === '#/register';
  const isDashboardRoute = hash === '#/dashboard';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-dark)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full"
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
    return (
      <AnimatePresence mode="wait">
        <motion.div key="auth" variants={pageVariants} initial="initial" animate="enter" exit="exit">
          <AuthPage />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (isDashboardRoute) {
    if (!user || !profile) {
      window.location.hash = '#/auth';
      return null;
    }
    // Client-side guard: only the authorized admin email may see the AdminPanel.
    // The DB trigger enforces this server-side; this prevents stale-cache access.
    const AUTHORIZED_ADMIN = 'hussein7.7naser@gmail.com';
    if (profile.role === 'admin' && user.email !== AUTHORIZED_ADMIN) {
      // Demote locally and redirect away
      window.location.hash = '#/auth';
      return null;
    }
    return (
      <AnimatePresence mode="wait">
        <motion.div key="dashboard" variants={pageVariants} initial="initial" animate="enter" exit="exit">
          <Suspense fallback={<LazyFallback />}>
            {profile.role === 'citizen' && <CitizenDashboard theme={theme} onToggleTheme={toggle} />}
            {profile.role === 'pharmacist' && <PharmacistDashboard theme={theme} onToggleTheme={toggle} />}
            {profile.role === 'facility_owner' && <FacilityDashboard theme={theme} onToggleTheme={toggle} />}
            {profile.role === 'admin' && <AdminPanel />}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] text-[var(--text-main)] selection:bg-brand-green/30">
      <OfflineIndicator />
      <ScrollProgress />
      <CustomCursor />
      <BackToTop />
      <SocialShare />
      <AccessibilityPanel />
      <ExitIntent />

      <Navbar theme={theme} onToggleTheme={toggle} />

      <main>
        <Hero />
        <Problem />
        <Solution />
        <InteractiveDemo />
        <LiveMap />
        <HowItWorks />
        <Users />
        <AppPreview />
        <Comparison />
        <UseCases />
        <WaitTimeCalculator />
        <StatsDashboard />
        <LiveFeed />
        <ImpactMetrics />
        <Testimonials />
        <CommunityStories />
        <PrivacySecurity />
        <TechStack />
        <About />
        <Roadmap />
        <FAQ />
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
