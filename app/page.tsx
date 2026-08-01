import Amenities from "./_components/Amenities";
import BeforeAfter from "./_components/BeforeAfter";
import Contact, { Footer } from "./_components/Contact";
import CustomCursor from "./_components/CustomCursor";
import Gallery from "./_components/Gallery";
import Hero from "./_components/Hero";
import Location from "./_components/Location";
import Manifesto from "./_components/Manifesto";
import Residences from "./_components/Residences";
import SiteHeader from "./_components/SiteHeader";
import SmoothScroll from "./_components/SmoothScroll";
export default function Home() {
  return (
    <>
      <SmoothScroll />
      <CustomCursor />
      <SiteHeader />

      <main>
        <Hero />
        <Manifesto />
        <BeforeAfter />
        <Residences />
        <Gallery />
        <Amenities />
        <Location />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
