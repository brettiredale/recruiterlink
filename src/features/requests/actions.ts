"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { sendRequestNotification } from "./notify";
import {
  validateRequest,
  type RequestErrors,
  type RequestField,
} from "./validate";

export type RequestFormState =
  | { status: "idle" }
  | { status: "sent"; email: string | null }
  | {
      status: "error";
      /** A problem that is not about one field (for example, too many requests). */
      message?: string;
      errors: RequestErrors;
      values: Partial<Record<RequestField, string>>;
    };

const SOURCES = new Set(["/for-agencies", "/contact"]);

/**
 * Stores a "register your interest", "claim your listing" or contact
 * request in `public.listing_requests`. The database only lets the site add
 * rows (never read them), and limits how many one email address or the
 * whole site can send per hour.
 */
export async function submitRequest(
  _previous: RequestFormState,
  formData: FormData,
): Promise<RequestFormState> {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") raw[key] = value;
  }

  const result = validateRequest(raw);
  // A bot filled the hidden field: look successful, store nothing.
  if (result.ok === "bot") return { status: "sent", email: null };
  if (result.ok === false) {
    return { status: "error", errors: result.errors, values: result.values };
  }

  const request = result.value;
  const source = typeof raw.source === "string" && SOURCES.has(raw.source) ? raw.source : null;
  const values: Partial<Record<RequestField, string>> = {
    kind: request.kind,
    name: request.name,
    email: request.email,
    agencyName: request.agencyName ?? "",
    website: request.website ?? "",
    message: request.message ?? "",
  };

  try {
    const { error } = await getSupabaseServerClient().from("listing_requests").insert({
      kind: request.kind,
      name: request.name,
      email: request.email,
      agency_name: request.agencyName,
      website: request.website,
      message: request.message,
      source_path: source,
    });
    if (error) {
      const limited = error.hint?.startsWith("rate_limited");
      if (!limited) console.error("listing_requests insert failed:", error.code, error.message);
      return {
        status: "error",
        errors: {},
        values,
        message: limited
          ? "We have already received several requests from you in the last hour. Please try again later."
          : "Sorry, we could not record your request. Please try again in a few minutes.",
      };
    }
  } catch (error) {
    console.error("listing_requests insert failed:", error);
    return {
      status: "error",
      errors: {},
      values,
      message: "Sorry, we could not record your request. Please try again in a few minutes.",
    };
  }

  // Stored safely; now tell the owner. A failed email never fails the request.
  await sendRequestNotification({
    kind: request.kind,
    name: request.name,
    email: request.email,
    agencyName: request.agencyName,
    website: request.website,
    message: request.message,
    sourcePath: source,
  });

  return { status: "sent", email: request.email };
}
