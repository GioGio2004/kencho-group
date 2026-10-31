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
    <header className={`interior-hero${image ? " interior-hero-with-image" : ""}`}>
      <div className="interior-hero-copy">
        {meta && <p className="interior-hero-prelude">{meta}</p>}
        <h1>{title}</h1>
        {line && <p className="interior-hero-description">{line}</p>}
      </div>
      {image && (
        <div className="interior-hero-image">
          <Image src={image.src} alt={image.alt} fill sizes="(max-width: 1023px) 100vw, 50vw" preload />
        </div>
      )}
    </header>
  );
}
