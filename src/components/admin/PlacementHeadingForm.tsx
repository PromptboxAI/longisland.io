"use client";

import { Check, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { updateSection, type EditorialActionState } from "@/app/admin/editorial/actions";

/**
 * The only two settings a system placement actually has.
 *
 * The full section form asks for a key, a scope, a layout and an item limit.
 * On a fixed placement every one of those is decided by the code that renders
 * it: the homepage asks for this slot by name, draws it in a shape it chose,
 * and takes as many items as it has room for. Offering them as editable fields
 * is worse than useless — it invites an editor to change something that either
 * does nothing or quietly breaks the page.
 *
 * What genuinely does something is the heading above the row and the line under
 * it, and only on placements that draw one. So that is all this asks for, and
 * placements with no visible heading get no form at all rather than two fields
 * that write to the database and never appear.
 */
export function PlacementHeadingForm({
  sectionId,
  title,
  description,
  defaultHeading,
  scopeType,
  categoryId,
  placeId,
  layout,
  maxItems,
  status,
}: {
  sectionId: string;
  title: string | null;
  description: string | null;
  /** What the page shows when the title is blank. */
  defaultHeading: string;
  /*
   * Carried through untouched. The action validates the whole row, so these
   * travel as hidden inputs rather than being re-asked — an editor changing a
   * heading has no business restating the layout.
   */
  scopeType: string;
  categoryId: string | null;
  placeId: string | null;
  layout: string;
  maxItems: number | null;
  status: string;
}) {
  const [state, formAction, pending] = useActionState<EditorialActionState, FormData>(
    updateSection,
    {},
  );

  const input =
    "mt-1.5 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form action={formAction} className="rounded-card border border-line bg-white p-5">
      <input type="hidden" name="id" value={sectionId} />
      <input type="hidden" name="scopeType" value={scopeType} />
      <input type="hidden" name="categoryId" value={categoryId ?? ""} />
      <input type="hidden" name="placeId" value={placeId ?? ""} />
      <input type="hidden" name="layout" value={layout} />
      <input type="hidden" name="maxItems" value={maxItems ?? ""} />
      <input type="hidden" name="status" value={status} />

      <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900">
        Heading on the page
      </h2>
      <p className="mt-1 text-xs text-ink-500">
        What readers see above this row.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="section-title"
            className="block text-xs font-semibold text-navy-900"
          >
            Heading
          </label>
          <input
            id="section-title"
            name="title"
            type="text"
            defaultValue={title ?? ""}
            placeholder={defaultHeading}
            className={input}
          />
          <p className="mt-1 text-xs text-ink-400">
            Leave empty to use &ldquo;{defaultHeading}&rdquo;.
          </p>
        </div>

        <div>
          <label
            htmlFor="section-description"
            className="block text-xs font-semibold text-navy-900"
          >
            Line underneath{" "}
            <span className="font-normal text-ink-500">(optional)</span>
          </label>
          <input
            id="section-description"
            name="description"
            type="text"
            defaultValue={description ?? ""}
            className={input}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full border border-navy-300 px-4 py-1.5 text-sm font-semibold text-navy-900 hover:bg-navy-50 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          Save heading
        </button>
        {state.ok ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <Check aria-hidden="true" className="size-3.5" />
            Saved
          </span>
        ) : null}
        {state.error ? (
          <span className="text-xs font-semibold text-red-700">{state.error}</span>
        ) : null}
      </div>
    </form>
  );
}
