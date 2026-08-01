import { Heart, Gift, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { DonationModal } from '@/components/DonationModal';
import { useState } from 'react';

interface DashboardProps {
  onSignOut: () => void;
}

export function Dashboard({ onSignOut }: DashboardProps) {
  const { profile } = useAuth();
  const { t, isRTL } = useLang();
  const [showDonate, setShowDonate] = useState(false);

  const roleLabel = profile?.role === 'pharmacist' ? t('auth.pharmacist') : profile?.role === 'facility' ? t('auth.facility') : t('auth.citizen');

  return (
    <>
      <div className="min-h-screen pt-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="glass-card p-6 border-glow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-cairo font-bold text-xl">{profile?.display_name}</h1>
                  <p className="text-sm font-tajawal text-[var(--text-muted)]">{roleLabel} — {profile?.email}</p>
                  {profile?.phone && <p className="text-xs font-tajawal text-[var(--text-muted)]">{profile.phone}</p>}
                </div>
              </div>
              <button onClick={onSignOut} className="btn-secondary text-sm flex items-center gap-1.5">
                <LogOut className="w-4 h-4" />
                {t('nav.logout')}
              </button>
            </div>
          </div>

          {/* Donation card — visible in dashboard for all roles */}
          <div className="mt-4 glass-card p-5 border-glow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-green/15 flex items-center justify-center">
                <Gift className="w-5 h-5 text-brand-green-light" />
              </div>
              <div>
                <h2 className="font-cairo font-bold">{t('donate.title')}</h2>
                <p className="text-xs font-tajawal text-[var(--text-muted)]">{t('donate.subtitle')}</p>
              </div>
            </div>
            <button onClick={() => setShowDonate(true)} className="btn-primary w-full flex items-center justify-center gap-2">
              <Heart className="w-5 h-5" />
              {t('donate.platform')}
            </button>
          </div>
        </div>
      </div>
      <DonationModal open={showDonate} onClose={() => setShowDonate(false)} />
    </>
  );
}
