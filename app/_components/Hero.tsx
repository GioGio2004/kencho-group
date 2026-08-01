const NAV_ITEMS = [
  { href: "#projects", label: "პროექტები" },
  { href: "#contact", label: "კონტაქტი" },
];

const MARQUEE_ITEMS = [
  "სამზარეულო",
  "გარდერობი",
  "მისაღები",
  "კომერციული ინტერიერი",
  "ბიბლიოთეკა",
  "საძინებელი",
];

function MarqueeRun() {
  return (
    <div className="flex items-center">
      {MARQUEE_ITEMS.map((item) => (
        <span
          key={item}
          className="flex items-center gap-8 pr-8 text-sm uppercase tracking-[0.3em] text-ink/45 sm:text-base"
        >
          {item}
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-gold-deep/70"
          />
        </span>
      ))}
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-paper text-ink">
      <div className="kg-noise" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/4 left-1/2 h-[70vmin] w-[90vmin] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(201,162,75,0.16), transparent 70%)",
        }}
      />

      <header
        data-site-nav
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 sm:px-10"
      >
        <a
          href="#top"
          data-reveal="fade"
          className="font-display text-sm tracking-[0.35em] text-ink"
        >
          KENCHO{" "}
          <span className="text-[0.65rem] tracking-[0.3em] text-gold-deep">
            GROUP
          </span>
        </a>
        <nav className="hidden items-center gap-8 sm:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              data-reveal="fade"
              className="text-sm text-ink/60 transition-colors hover:text-gold-deep"
            >
              {item.label}
            </a>
          ))}
          <a
            href="https://wa.me/995592822260"
            target="_blank"
            rel="noopener noreferrer"
            data-reveal="fade"
            data-magnetic
            className="rounded-full border border-gold-deep/40 px-5 py-2 text-sm text-gold-deep transition-colors hover:bg-gold hover:text-coal"
          >
            დაგვიკავშირდით
          </a>
        </nav>
      </header>

      <div
        data-hero-inner
        className="relative z-10 flex flex-1 flex-col justify-center px-6 pt-20 sm:px-10"
      >
        <p
          data-reveal="fade"
          className="mb-5 text-[0.65rem] uppercase tracking-[0.35em] text-gold-deep sm:text-xs"
        >
          კენჭო ჯგუფი — ავეჯი შეკვეთით · თბილისი
        </p>

        <h1 className="font-serif-ka uppercase leading-[1.02] text-ink">
          <span
            data-split
            className="block text-[clamp(2.1rem,10.5vw,10rem)]"
          >
            ესკიზიდან
          </span>
          <span
            data-split
            className="ml-[4vw] block text-[clamp(2.1rem,10.5vw,10rem)]"
          >
            რეალობამდე<span className="text-gold">.</span>
          </span>
        </h1>

        <div className="mt-10 flex flex-col gap-8 sm:mt-14 sm:flex-row sm:items-end sm:justify-between">
          <p
            data-reveal="fade"
            className="max-w-md text-sm leading-relaxed text-ink/60 sm:text-base"
          >
            Custom furniture and interiors, made in Georgia. Kitchens,
            wardrobes, and full commercial fit-outs — from the first sketch to
            the final install.
          </p>

          <div data-reveal="fade" className="flex flex-wrap items-center gap-4">
            <a
              href="https://wa.me/995592822260"
              target="_blank"
              rel="noopener noreferrer"
              data-magnetic
              className="rounded-full bg-gold px-7 py-3.5 text-sm font-medium text-coal shadow-glow-gold transition-colors hover:bg-gold-bright"
            >
              მოგვწერეთ WhatsApp-ზე
            </a>
            <a
              href="tel:+995592822260"
              data-magnetic
              className="rounded-full border border-ink/20 px-7 py-3.5 text-sm tabular-nums text-ink/70 transition-colors hover:border-gold-deep hover:text-gold-deep"
            >
              +995 592 82 22 60
            </a>
          </div>
        </div>
      </div>

      <div
        data-reveal="fade"
        className="kg-marquee relative z-10 mt-12 border-y border-ink/10 py-4"
      >
        <div className="kg-marquee-track">
          <MarqueeRun />
          <MarqueeRun />
        </div>
      </div>
    </section>
  );
}
