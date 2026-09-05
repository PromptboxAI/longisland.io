"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field, FormError, HoneypotField } from "@/components/forms/Field";
import { leadSchema, type LeadInput } from "@/lib/validation";

const INTERESTS = [
  "Sponsored content",
  "Featured business profile",
  "Social video",
  "Category sponsorship",
  "Local guide sponsorship",
  "Newsletter sponsorship",
  "Custom campaign",
  "Not sure yet",
];

const BUDGETS = [
  "Under $1,000 / month",
  "$1,000 – $2,500 / month",
  "$2,500 – $5,000 / month",
  "$5,000+ / month",
  "One-off campaign",
  "Prefer to discuss",
];

export interface LeadFormProps {
  /** Pre-fills the business name, e.g. from a "Claim this business" link. */
  defaultBusinessName?: string;
}

export function LeadForm({ defaultBusinessName = "" }: LeadFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: { businessName: defaultBusinessName },
  });

  async function onSubmit(values: LeadInput) {
    setFormError("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const body = (await response.json()) as {
        error?: string;
        fields?: Record<string, string>;
      };

      if (!response.ok) {
        if (body.fields) {
          for (const [name, message] of Object.entries(body.fields)) {
            setError(name as keyof LeadInput, { message });
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
        <h2 className="mt-4 text-xl font-bold text-navy-900">Thanks — we got it</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-700">
          Someone from our team will be in touch within two business days to talk
          through what would work for your business.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-md border border-line px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <HoneypotField register={register("website")} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" required error={errors.name?.message} htmlFor="lead-name">
          <input
            id="lead-name"
            type="text"
            autoComplete="name"
            {...register("name")}
            className={inputClass}
          />
        </Field>

        <Field
          label="Business name"
          required
          error={errors.businessName?.message}
          htmlFor="lead-business"
        >
          <input
            id="lead-business"
            type="text"
            autoComplete="organization"
            {...register("businessName")}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" required error={errors.email?.message} htmlFor="lead-email">
          <input
            id="lead-email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className={inputClass}
          />
        </Field>

        <Field label="Phone" error={errors.phone?.message} htmlFor="lead-phone">
          <input
            id="lead-phone"
            type="tel"
            autoComplete="tel"
            {...register("phone")}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Website" error={errors.websiteUrl?.message} htmlFor="lead-website">
          <input
            id="lead-website"
            type="url"
            inputMode="url"
            placeholder="https://"
            {...register("websiteUrl")}
            className={inputClass}
          />
        </Field>

        <Field label="Category" error={errors.category?.message} htmlFor="lead-category">
          <input
            id="lead-category"
            type="text"
            placeholder="Restaurant, roofing, real estate…"
            {...register("category")}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="What are you interested in?"
          required
          error={errors.interest?.message}
          htmlFor="lead-interest"
        >
          <select
            id="lead-interest"
            defaultValue=""
            {...register("interest")}
            className={`${inputClass} bg-white`}
          >
            <option value="" disabled>
              Choose one
            </option>
            {INTERESTS.map((interest) => (
              <option key={interest} value={interest}>
                {interest}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Budget" error={errors.budget?.message} htmlFor="lead-budget">
          <select
            id="lead-budget"
            defaultValue=""
            {...register("budget")}
            className={`${inputClass} bg-white`}
          >
            <option value="">Prefer not to say</option>
            {BUDGETS.map((budget) => (
              <option key={budget} value={budget}>
                {budget}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Message" error={errors.message?.message} htmlFor="lead-message">
        <textarea
          id="lead-message"
          rows={5}
          placeholder="Tell us about your business and what you are trying to reach."
          {...register("message")}
          className={inputClass}
        />
      </Field>

      <FormError message={formError} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 rounded-full bg-navy-900 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
      >
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Sending
          </>
        ) : (
          "Start a Conversation"
        )}
      </button>
    </form>
  );
}
