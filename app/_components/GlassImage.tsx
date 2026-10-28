import Image, { type ImageProps } from "next/image";

type GlassImageProps = Omit<ImageProps, "fill" | "width" | "height"> & {
  imageClassName?: string;
};

/** A rounded photograph surface. The legacy name keeps existing imports stable. */
export default function GlassImage({ className = "", imageClassName = "", alt, ...props }: GlassImageProps) {
  return (
    <figure className={`glass-media ${className}`}>
      <Image {...props} alt={alt} fill className={`object-cover ${imageClassName}`} />
    </figure>
  );
}
