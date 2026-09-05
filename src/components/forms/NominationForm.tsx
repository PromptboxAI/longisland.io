"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field, FormError, HoneypotField } from "@/components/forms/Field";
import { nominationSchema, type NominationInput } from "@/lib/validation";

const CATEGORIES = [
  "Restaurant",
  "Pizza",
  "Bagels",
  "Bar or Brewery",
  "Coffee or Bakery",
  "Things to Do",
  "Beach or Park",
  "Home Services",
  "Contractor or Trade",
  "Family or Kids",
  "Health & Beauty",
  "Shopping",
  "Other",
];

export function NominationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NominationInput>({
    resolver: zodResolver(nominationSchema),
    defaultValues: { genuine: false },
  });

  async function onSubmit(values: NominationInput) {
    setFormError("");

    try {
      const response = await fetch("/api/nominations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok) {
        // Surface server-side field errors on the matching inputs.
        if (body.fields) {
          for (const [name, message] of Object.entries(body.fields)) {
            setError(name as keyof NominationInput, { message });
          }
        }
        setFormError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setFormError("Could not reach the server. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-card border border-brand-200 bg-brand-50 p-8 text-center"
      >
        <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-brand-600" />
        <h2 className="mt-4 text-xl font-bold text-navy-900">Nomination received</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-700">
          Thank you. An editor reads every nomination. If it fits a list we are
          working on, we will research it — we cannot promise a spot, and a
          nomination never buys one.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/best"
            className="rounded-full bg-navy-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Browse rankings
          </Link>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="rounded-full border border-navy-300 px-6 py-2.5 text-sm font-semibold text-navy-900 hover:bg-white"
          >
            Nominate another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <HoneypotField register={register("website")} />

      <Field
        label="Business name"
        required
        error={errors.businessName?.message}
        htmlFor="businessName"
      >
        <input
          id="businessName"
          type="text"
          autoComplete="organization"
          {...register("businessName")}
          className="w-full rounded-md border border-line px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Town" required error={errors.town?.message} htmlFor="town">
          <input
            id="town"
            type="text"
            placeholder="Huntington"
            {...register("town")}
            className="w-full rounded-md border border-line px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field
          label="Category"
          required
          error={errors.category?.message}
          htmlFor="category"
        >
          <select
            id="category"
            defaultValue=""
            {...register("category")}
            className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="" disabled>
              Choose a category
            </option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Website"
        error={errors.websiteUrl?.message}
        htmlFor="websiteUrl"
        hint="Optional. Include https://"
      >
        <input
          id="websiteUrl"
          type="url"
          inputMode="url"
          placeholder="https://"
          {...register("websiteUrl")}
          className="w-full rounded-md border border-line px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
      </Field>

      <Field
        label="Why should they be included?"
        required
        error={errors.reason?.message}
        htmlFor="reason"
        hint="What makes it worth a spot? Specifics help more than superlatives."
      >
        <textarea
          id="reason"
          rows={5}
          {...register("reason")}
          className="w-full rounded-md border border-line px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Your name"
          error={errors.submitterName?.message}
          htmlFor="submitterName"
          hint="Optional"
        >
          <input
            id="submitterName"
            type="text"
            autoComplete="name"
            {...register("submitterName")}
            className="w-full rounded-md border border-line px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>

        <Field label="Email" required error={errors.email?.message} htmlFor="email">
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full rounded-md border border-line px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </Field>
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            {...register("genuine")}
            className="mt-0.5 size-4 shrink-0 rounded border-line text-brand-600 focus:ring-2 focus:ring-brand-500"
          />
          <span>
            I confirm this nomination is genuine and I am not being paid to submit
            it.
          </span>
        </label>
        {errors.genuine?.message ? (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.genuine.message}
          </p>
        ) : null}
      </div>

      <FormError message={formError} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Submitting
          </>
        ) : (
          "Submit Nomination"
        )}
      </button>
    </form>
  );
}
