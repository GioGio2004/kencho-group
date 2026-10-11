import Image from "next/image";

/*
 * The band that opens an inner page: a small line at the top, a
 * sentence in the middle, the title at the foot, and a picture on the
 * right when the page has one.
 */
export default function PageHeader({
  meta,
  line,
  title,
  image,
}: {
  meta?: string;
  line?: string;
  title: string;
  image?: { src: string; alt: string };
}) {
  return (
    <header className={`ph${image ? "" : " ph-solo"}`}>
      <div className="ph-copy">
        <p className="u-meta max-w-[22rem] text-ink-2">{meta}</p>
        {line && <p className="max-w-[30rem] text-[0.9375rem] leading-relaxed text-ink-2 lg:ml-[30%]">{line}</p>}
        <h1 className="ph-title u-display">{title}</h1>
      </div>
      {image && (
        <div className="ph-img">
          <Image src={image.src} alt={image.alt} fill sizes="(max-width: 1023px) 100vw, 50vw" preload />
        </div>
      )}
    </header>
  );
}
