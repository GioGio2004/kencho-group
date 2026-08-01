/*
 * Dark closing block — bookends the light page with the brand coal,
 * gives the #contact anchor a real target, and carries the LED hairline
 * motif from Kencho's backlit furniture.
 */
export default function ContactSection() {
  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-coal text-cream"
    >
      <div className="kg-noise" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-1/3 left-1/2 h-[70vmin] w-[100vmin] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(201,162,75,0.18), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex min-h-[80svh] flex-col items-center justify-center px-6 py-28 text-center">
        <p
          data-srev
          className="text-[0.65rem] uppercase tracking-[0.35em] text-gold/80 sm:text-xs"
        >
          (02) — კონტაქტი
        </p>

        <h2
          data-srev
          className="mt-6 font-serif-ka text-[clamp(2.6rem,8vw,7rem)] uppercase leading-[1.05]"
        >
          დაიწყე პროექტი<span className="text-gold">.</span>
        </h2>

        <p
          data-srev
          className="mt-6 max-w-md text-sm leading-relaxed text-cream/60 sm:text-base"
        >
          გვიამბეთ თქვენი სივრცის შესახებ — ესკიზს ჩვენ დავხატავთ.
        </p>

        <div
          data-srev
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="https://wa.me/995592822260"
            target="_blank"
            rel="noopener noreferrer"
            data-magnetic
            className="rounded-full bg-gold px-9 py-4 text-sm font-medium text-coal shadow-glow-gold transition-colors hover:bg-gold-bright sm:text-base"
          >
            მოგვწერეთ WhatsApp-ზე
          </a>
          <a
            href="tel:+995592822260"
            data-magnetic
            className="rounded-full border border-cream/25 px-9 py-4 text-sm tabular-nums text-cream/80 transition-colors hover:border-gold hover:text-gold-bright sm:text-base"
          >
            +995 592 82 22 60
          </a>
        </div>

        <div
          data-srev
          className="mt-16 flex items-center gap-6 text-[0.65rem] uppercase tracking-[0.3em] text-cream/40 sm:text-xs"
        >
          <a
            href="https://www.facebook.com/KenchoGroup"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-gold-bright"
          >
            Facebook
          </a>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold/60" />
          <a
            href="https://www.tiktok.com/@kenchogroup"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-gold-bright"
          >
            TikTok
          </a>
        </div>
      </div>

      <div className="relative z-10 border-t border-cream/10 px-6 py-6 text-center">
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-cream/35 sm:text-xs">
          © 2026 Kencho Group — კენჭო ჯგუფი · ესკიზიდან რეალობამდე
        </p>
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px"
        style={{
          background: "rgba(233,181,88,0.75)",
          boxShadow: "0 0 18px 3px rgba(233,181,88,0.4)",
        }}
      />
    </section>
  );
}
