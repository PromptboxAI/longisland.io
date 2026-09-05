export interface StatusPillProps {
  status: string;
}

/** Consistent status colouring across every admin table. */
const TONES: Record<string, string> = {
  published: "bg-brand-50 text-brand-800 border-brand-200",
  draft: "bg-sand-100 text-ink-700 border-line",
  review: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-navy-50 text-navy-600 border-navy-200",

  new: "bg-brand-50 text-brand-800 border-brand-200",
  reviewing: "bg-amber-50 text-amber-800 border-amber-200",
  approved: "bg-green-50 text-green-800 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",

  contacted: "bg-amber-50 text-amber-800 border-amber-200",
  qualified: "bg-green-50 text-green-800 border-green-200",
  closed: "bg-navy-50 text-navy-600 border-navy-200",

  idea: "bg-sand-100 text-ink-700 border-line",
  script: "bg-amber-50 text-amber-800 border-amber-200",
  media: "bg-brand-50 text-brand-800 border-brand-200",
  ready: "bg-green-50 text-green-800 border-green-200",
};

export function StatusPill({ status }: StatusPillProps) {
  const tone = TONES[status] ?? "bg-sand-100 text-ink-700 border-line";

  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${tone}`}
    >
      {status}
    </span>
  );
}
