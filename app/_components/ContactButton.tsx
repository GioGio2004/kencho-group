"use client";

import { useContact } from "@/app/_components/ContactProvider";
import { Link } from "@/i18n/navigation";

/* Opens the site's contact sheet — for server components that need a
 * "Get in touch" button without becoming client components themselves. */
export default function ContactButton({
  label,
  className = "btn btn-ink",
}: {
  label: string;
  className?: string;
}) {
  const openContact = useContact();
  return (
    <Link
      href="/contact"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        event.preventDefault();
        openContact();
      }}
      className={className}
    >
      {label}
    </Link>
  );
}
