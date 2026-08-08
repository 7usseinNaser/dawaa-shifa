import { SectionBoundary } from '@/components/ui/SectionBoundary';
import ImpactMetrics from '@/components/ImpactMetrics';
import LiveFeedStrip from '@/components/LiveFeedStrip';
import Testimonials from '@/components/Testimonials';
import CommunityStories from '@/components/CommunityStories';
import UseCases from '@/components/UseCases';
import Users from '@/components/Users';

/**
 * ImpactSection — groups impact-related components under a shared
 * visual gradient so they read as one unified section.
 */
export default function ImpactSection() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(62,214,200,0.02)] to-transparent pointer-events-none" />
      <SectionBoundary name="impact-metrics"><ImpactMetrics /></SectionBoundary>
      <LiveFeedStrip />
      <Testimonials />
      <CommunityStories />
      <UseCases />
      <Users />
    </div>
  );
}
