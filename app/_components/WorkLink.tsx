"use client";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
export default function WorkLink({
  href,
  className,
  children,
  onPointerEnter,
  onFocus,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onPointerEnter?: React.PointerEventHandler<HTMLAnchorElement>;
  onFocus?: React.FocusEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href={href}
      className={className}
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      onClick={() => track("OpenCatalogue", { source: href })}
    >
      {children}
    </Link>
  );
}
