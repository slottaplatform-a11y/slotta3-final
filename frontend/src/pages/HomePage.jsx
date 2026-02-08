import Navigation from '@/components/Navigation';
import HeroSection from '@/components/HeroSection';
import ProblemSection from '@/components/ProblemSection';
import InsightSection from '@/components/InsightSection';
import FeaturesSection from '@/components/FeaturesSection';
import ExampleBooking from '@/components/ExampleBooking';
import HowItWorks from '@/components/HowItWorks';
import WhoItsFor from '@/components/WhoItsFor';
import PricingSection from '@/components/PricingSection';
import PayoutSection from '@/components/PayoutSection';
import CTASection from '@/components/CTASection';
import FAQSection from '@/components/FAQSection';
import Footer from '@/components/Footer';

const HomePage = () => {
  return (
    <div className="relative min-h-screen bg-black text-white mesh-gradient">
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />
      <div className="grain" />

      <Navigation />
      <main>
        <HeroSection />
        <ProblemSection />
        <InsightSection />
        <FeaturesSection />
        <ExampleBooking />
        <HowItWorks />
        <WhoItsFor />
        <PricingSection />
        <PayoutSection />
        <CTASection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
