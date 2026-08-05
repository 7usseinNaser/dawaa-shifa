import LandingDonation from '@/components/LandingDonation';
import PrivacySecurity from '@/components/PrivacySecurity';
import FAQ from '@/components/FAQ';

/**
 * SupportSection — groups donation, privacy, and FAQ under a shared
 * visual gradient so they read as one unified section.
 */
export default function SupportSection() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(13,126,164,0.02)] to-transparent pointer-events-none" />
      <LandingDonation />
      <PrivacySecurity />
      <FAQ />
    </div>
  );
}
