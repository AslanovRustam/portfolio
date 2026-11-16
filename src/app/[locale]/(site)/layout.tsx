import { useTranslations } from 'next-intl';
import HooksMount from '@/dev/HooksMount';
import SmoothScroll from '@/scroll/SmoothScroll';
import ExperienceGate from '@/ui/ExperienceGate';
import Hero from '@/ui/Hero';
import NextButton from '@/ui/NextButton';
import ProgressTube from '@/ui/ProgressTube';
import ScrollAccent from '@/ui/ScrollAccent';
import SiteHeader from '@/ui/SiteHeader';
import JourneyTrack from '@/ui/flow/JourneyTrack';
import SectionFlow from '@/ui/flow/SectionFlow';
import WorkPanel from '@/ui/sections/WorkPanel';
import WorkSection from '@/ui/sections/WorkSection';
import AboutSection from '@/ui/sections/AboutSection';
import StackSection from '@/ui/sections/StackSection';
import ContactSection from '@/ui/sections/ContactSection';
import ContactBillboard from '@/ui/sections/ContactBillboard';

/**
 * The persistent experience: scene, scroll, header and sections. It wraps both the home page and the
 * case pages, so opening /work/<slug> only adds an overlay and never remounts the canvas.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  return (
    <>
      <ExperienceGate
        loaderLabel={t('loader.label')}
        loaderUnit={t('loader.unit')}
        fallbackTitle={t('fallback.title')}
        fallbackBody={t('fallback.body')}
      />
      <SiteHeader
        name={t('hero.name')}
        labels={{
          work: t('nav.work'),
          about: t('nav.about'),
          stack: t('nav.stack'),
          contact: t('nav.contact'),
          cv: t('nav.cv'),
          language: t('nav.language'),
          menu: t('nav.menu'),
          closeMenu: t('nav.closeMenu'),
        }}
      />
      <main className="relative z-10">
        <SmoothScroll />
        <HooksMount />
        <Hero name={t('hero.name')} role={t('hero.role')} line={t('hero.line')} />
        {/* the scroll track the whole journey is measured against; About's and Contact's text rides along it */}
        <JourneyTrack
          about={
            <SectionFlow id="about" labelledBy="about-title">
              <AboutSection />
            </SectionFlow>
          }
          contact={
            <SectionFlow id="contact" labelledBy="contact-title">
              <ContactSection />
            </SectionFlow>
          }
        />
        <WorkPanel>
          <WorkSection />
        </WorkPanel>
        <StackSection />
        <ContactBillboard />
      </main>
      <ScrollAccent />
      <ProgressTube />
      <NextButton
        prefix={t('nav.next')}
        labels={{ work: t('nav.work'), about: t('nav.about'), stack: t('nav.stack'), contact: t('nav.contact') }}
      />
      {children}
    </>
  );
}
