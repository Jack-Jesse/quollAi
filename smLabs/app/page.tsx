import SiteHeader from '@/components/ui/site-header';
import HeroAscii from '@/components/ui/hero-ascii';
import ServicesSection from '@/components/ui/services-section';
import AboutSection from '@/components/ui/about-section';
import ContactSection from '@/components/ui/contact-section';
import SiteFooter from '@/components/ui/site-footer';

export default function Home() {
  return (
    <main className="bg-black">
      <SiteHeader />
      <HeroAscii />
      <ServicesSection />
      <AboutSection />
      <ContactSection />
      <SiteFooter />
    </main>
  );
}
