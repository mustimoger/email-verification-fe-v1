import { HeroSection } from "@/components/HeroSection";
import { CoreFeaturesSection } from "@/components/CoreFeaturesSection";
import { AdvanceSolutionsSection } from "@/components/AdvanceSolutionsSection";
import { TwoCardsSection } from "@/components/TwoCardsSection";
import { RealTimeAnalyticsSection } from "@/components/RealTimeAnalyticsSection";
import PricingTeaser from "@/components/PricingTeaser";
import { CollaborationSection } from "@/components/CollaborationSection";
import { FaqSection } from "@/components/FaqSection";
import { TestimonialSection } from "@/components/TestimonialSection";
import { BlogSection } from "@/components/BlogSection";
import { GetStartedSection } from "@/components/GetStartedSection";

export default function Home() {
  return (
    <main id="scroll-trigger" className="min-h-screen">
      <HeroSection backgroundVideoSrc="/cube.webm" />
      <CoreFeaturesSection />
      <AdvanceSolutionsSection />
      <TwoCardsSection />
      <RealTimeAnalyticsSection />
      <PricingTeaser />
      <CollaborationSection />
      <FaqSection />
      <TestimonialSection />
      <BlogSection />
      <GetStartedSection />
    </main>
  );
}
