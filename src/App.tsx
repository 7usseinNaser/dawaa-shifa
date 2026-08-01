import { useState } from 'react';
import { ThemeProvider } from '@/lib/theme';
import { I18nProvider } from '@/lib/i18n';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ImpactMetrics, CommunityStories } from '@/components/Sections';
import { LandingDonation } from '@/components/LandingDonation';
import { AuthPage } from '@/components/AuthPage';
import { Dashboard } from '@/components/Dashboard';
import { BackToTop } from '@/components/BackToTop';

type View = 'landing' | 'auth' | 'dashboard';

function AppInner() {
  const { profile, signOut } = useAuth();
  const [view, setView] = useState<View>('landing');

  const handleLoginClick = () => {
    if (profile) setView('dashboard');
    else setView('auth');
  };

  const handleAuthSuccess = () => setView('dashboard');
  const handleBack = () => setView('landing');
  const handleSignOut = async () => { await signOut(); setView('landing'); };

  return (
    <div className="min-h-screen">
      <Navbar onLoginClick={handleLoginClick} />

      {view === 'landing' && (
        <>
          <Hero onLoginClick={handleLoginClick} />
          <ImpactMetrics />
          {/* Donation section between impact stats and field stories */}
          <LandingDonation />
          <CommunityStories />
        </>
      )}

      {view === 'auth' && <AuthPage onSuccess={handleAuthSuccess} onBack={handleBack} />}
      {view === 'dashboard' && <Dashboard onSignOut={handleSignOut} />}

      <BackToTop />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
