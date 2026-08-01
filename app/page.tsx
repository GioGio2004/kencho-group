import ContactSection from "./_components/ContactSection";
import CustomCursor from "./_components/CustomCursor";
import Hero from "./_components/Hero";
import HeroMotion from "./_components/HeroMotion";
import IntroSequence from "./_components/IntroSequence";
import ProjectShowcase from "./_components/ProjectShowcase";
import SectionReveals from "./_components/SectionReveals";
import SmoothScroll from "./_components/SmoothScroll";

export default function Home() {
  return (
    <main id="top">
      <SmoothScroll />
      <CustomCursor />
      <HeroMotion />
      <SectionReveals />
      <Hero />
      <ProjectShowcase />
      <ContactSection />
      <IntroSequence />
    </main>
  );
}
