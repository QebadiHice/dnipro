import { HeroSection } from '@/components/sections/HeroSection';
import { StatsSection } from '@/components/sections/StatsSection';
import { WhyDniproSection } from '@/components/sections/WhyDniproSection';
import { AdaptersPreview } from '@/components/sections/AdaptersPreview';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { ArchitectureDiagram } from '@/components/sections/ArchitectureDiagram';
import { DeveloperSection } from '@/components/sections/DeveloperSection';
import { VerificationSection } from '@/components/sections/VerificationSection';
import { CTASection } from '@/components/sections/CTASection';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <WhyDniproSection />
      <AdaptersPreview />
      <HowItWorks />
      <ArchitectureDiagram />
      <DeveloperSection />
      <VerificationSection />
      <CTASection />
    </>
  );
}
