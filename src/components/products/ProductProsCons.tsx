import { Check, Minus } from "lucide-react";

export interface ProductProsConsProps {
  pros: string[];
  cons: string[];
  /** Ties the two lists to the entry heading they belong to. */
  labelledBy?: string;
}

/**
 * Pros and cons for one product, in one guide.
 *
 * Both columns render or neither does. A list of upsides with no downsides reads
 * as marketing copy, and an entry that genuinely has no drawback worth naming
 * usually means nobody looked hard enough.
 *
 * The "con" icon is a minus rather than a cross: these are trade-offs in the
 * context of one guide's question, not defects.
 */
export function ProductProsCons({ pros, cons, labelledBy }: ProductProsConsProps) {
  if (pros.length === 0 && cons.length === 0) return null;

  return (
    <div
      aria-labelledby={labelledBy}
      className="grid gap-4 rounded border border-line bg-sand-50 p-4 sm:grid-cols-2"
    >
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
          Pros
        </h4>
        <ul className="mt-2 space-y-1.5">
          {pros.map((pro) => (
            <li key={pro} className="flex gap-2 text-sm leading-snug text-ink-700">
              <Check
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-brand-600"
              />
              {pro}
            </li>
          ))}
          {pros.length === 0 ? (
            <li className="text-sm text-ink-400">Not yet written.</li>
          ) : null}
        </ul>
      </div>

      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
          Cons
        </h4>
        <ul className="mt-2 space-y-1.5">
          {cons.map((con) => (
            <li key={con} className="flex gap-2 text-sm leading-snug text-ink-700">
              <Minus
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-ink-400"
              />
              {con}
            </li>
          ))}
          {cons.length === 0 ? (
            <li className="text-sm text-ink-400">Not yet written.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
