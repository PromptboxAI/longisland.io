"use client";

import { Lock } from "lucide-react";
import { useState, useTransition } from "react";

import { saveBusinessContact } from "@/app/admin/businesses/actions";

/**
 * Who to talk to at a business, and how. Never published.
 *
 * Separated from the public details above it — visually, and in the database —
 * because the distinction is the whole point. The `Website` and `Phone` fields
 * on the form above are things a reader sees on the profile page. Everything
 * here is ours: an email for the outreach that turns a listing into an
 * advertiser, a name, a direct line, a note about the last conversation.
 *
 * It lives in `business_contacts`, which has no public read policy at all, so
 * "never published" is enforced by the database rather than by this component
 * remembering not to render it somewhere else.
 */
export function BusinessContactCard({
  businessId,
  initial,
}: {
  businessId: string;
  initial: {
    email: string | null;
    contactName: string | null;
    phone: string | null;
    notes: string | null;
  } | null;
}) {
  const [fields, setFields] = useState({
    email: initial?.email ?? "",
    contactName: initial?.contactName ?? "",
    phone: initial?.phone ?? "",
    notes: initial?.notes ?? "",
  });
  const [saving, startSave] = useTransition();
  const [note, setNote] = useState("");

  const set = (key: keyof typeof fields) => (value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  const input =
    "mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500";
  const label = "block text-xs font-semibold text-navy-900";

  function save() {
    startSave(async () => {
      const result = await saveBusinessContact(businessId, fields);
      setNote(result.error ?? "Saved.");
    });
  }

  return (
    <section className="rounded-card border border-navy-200 bg-navy-50/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-navy-900">
        <Lock aria-hidden="true" className="size-4 text-navy-700" />
        Private contact details
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-700">
        Ours only. None of this appears on the public profile, in a ranking, or
        in the page source — it is held in a table the public site cannot read.
        The Website and Phone above are the ones readers see.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contactEmail" className={label}>
            Email
          </label>
          <input
            id="contactEmail"
            type="email"
            value={fields.email}
            onChange={(event) => set("email")(event.target.value)}
            placeholder="owner@example.com"
            className={input}
          />
        </div>

        <div>
          <label htmlFor="contactName" className={label}>
            Who to ask for
          </label>
          <input
            id="contactName"
            type="text"
            value={fields.contactName}
            onChange={(event) => set("contactName")(event.target.value)}
            placeholder="Dave, the owner"
            className={input}
          />
        </div>

        <div>
          <label htmlFor="contactPhone" className={label}>
            Direct line{" "}
            <span className="font-normal text-ink-500">(if different)</span>
          </label>
          <input
            id="contactPhone"
            type="tel"
            value={fields.phone}
            onChange={(event) => set("phone")(event.target.value)}
            className={input}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contactNotes" className={label}>
            Notes
          </label>
          <textarea
            id="contactNotes"
            rows={3}
            value={fields.notes}
            onChange={(event) => set("notes")(event.target.value)}
            placeholder="Spoke to Dave in March — interested in a feature, call back after the summer."
            className={input}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-full bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save contact details"}
        </button>
        {note ? (
          <span
            aria-live="polite"
            className={`text-xs font-semibold ${
              note === "Saved." ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {note}
          </span>
        ) : null}
      </div>
    </section>
  );
}
