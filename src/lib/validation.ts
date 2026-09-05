import { z } from "zod";

/**
 * Shared request schemas.
 *
 * These run on the server in the route handlers. Client-side validation is a
 * convenience layer only — never the enforcement point.
 */

/**
 * Honeypot: a field real users never see and never fill. Bots that blindly
 * complete every input give themselves away. Cheap, no third-party service, and
 * no accessibility cost because the input is hidden from assistive tech too.
 */
const honeypot = z
  .string()
  .max(0, "Rejected.")
  .optional()
  .or(z.literal(""));

const email = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(255)
  .email("Enter a valid email address.");

export const newsletterSchema = z.object({
  email,
  source: z.string().trim().max(64).optional(),
  website: honeypot,
});

export const nominationSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, "Business name is required.")
    .max(200),
  town: z.string().trim().min(2, "Town is required.").max(120),
  category: z.string().trim().min(1, "Pick a category.").max(120),
  websiteUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .or(z.literal(""))
    .refine(
      (value) => !value || /^https?:\/\/.+\..+/.test(value),
      "Enter a full URL starting with http:// or https://",
    ),
  reason: z
    .string()
    .trim()
    .min(20, "Tell us a little more — at least 20 characters.")
    .max(2000),
  submitterName: z.string().trim().max(120).optional().or(z.literal("")),
  email,
  genuine: z
    .boolean()
    .refine((value) => value, "Please confirm this nomination is genuine."),
  website: honeypot,
});

export const leadSchema = z.object({
  name: z.string().trim().min(2, "Your name is required.").max(120),
  businessName: z.string().trim().min(2, "Business name is required.").max(200),
  email,
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  websiteUrl: z.string().trim().max(300).optional().or(z.literal("")),
  category: z.string().trim().max(120).optional().or(z.literal("")),
  interest: z.string().trim().min(1, "Tell us what you are interested in.").max(200),
  budget: z.string().trim().max(80).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  website: honeypot,
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type NominationInput = z.infer<typeof nominationSchema>;
export type LeadInput = z.infer<typeof leadSchema>;

/** Collapses a ZodError into the first message per field, for form display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
