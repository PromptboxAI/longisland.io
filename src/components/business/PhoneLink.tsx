import type { ReactNode } from "react";

/**
 * A phone number that dials.
 *
 * Every business number on the site should be tappable — on a phone, calling
 * is what most people came to the page to do, and a number set as plain text
 * makes them select it, copy it and paste it into the dialler. The ranking
 * entries were doing exactly that, while the business page linked the same
 * number, so the same detail behaved differently depending on where you
 * happened to be looking at it.
 *
 * `tel:` wants digits, not the punctuation people read. "(631) 555-0134"
 * dials reliably as "+16315550134" and unreliably as typed, so the display
 * string and the dialled string are deliberately different things — the reader
 * sees the formatted number, the dialler gets the bare one.
 *
 * A leading + is kept where it exists, because an international number without
 * its country code is worse than no link at all.
 */
export function PhoneLink({
  phone,
  className = "",
  children,
}: {
  phone: string;
  className?: string;
  /** What to show. Defaults to the number as it was written. */
  children?: ReactNode;
}) {
  const dialled = phone.replace(/[^\d+]/g, "");
  // Nothing to dial: show the text rather than a link that goes nowhere.
  if (!/\d/.test(dialled)) return <>{children ?? phone}</>;

  return (
    <a href={`tel:${dialled}`} className={className}>
      {children ?? phone}
    </a>
  );
}
