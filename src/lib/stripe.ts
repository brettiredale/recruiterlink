import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getStripeSecretKey } from "./env";

/**
 * A small Stripe client over fetch. The site needs four calls (start a
 * checkout, read it back, read a subscription, open the billing portal) and
 * a webhook signature check, so no SDK.
 *
 * The API version is pinned so responses keep the same shape whatever the
 * account's default version is.
 */
const API = "https://api.stripe.com/v1";
const API_VERSION = "2026-05-27.dahlia";

/** Premium prices on product prod_VcGWJLqazg5MzC. */
export const PREMIUM_PRICES = {
  month: "price_1Ub1zeAuVFaJ0APtBChvitAJ",
  year: "price_1Ub22WAuVFaJ0APtUHkJeyrU",
} as const;

export type BillingInterval = keyof typeof PREMIUM_PRICES;

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year";
}

type Params = Record<string, string | number | boolean | undefined>;

export class StripeError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
  ) {
    super(message);
    this.name = "StripeError";
  }
}

async function stripe<T>(method: "GET" | "POST", path: string, params: Params = {}): Promise<T> {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) body.append(key, String(value));
  }
  const url = method === "GET" && body.size > 0 ? `${API}${path}?${body}` : `${API}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      "Stripe-Version": API_VERSION,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? body : undefined,
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as
    | (T & { error?: undefined })
    | { error?: { message?: string; code?: string } }
    | null;
  if (!response.ok || !json || json.error) {
    const error = json?.error;
    throw new StripeError(error?.message ?? `Stripe ${method} ${path} failed`, response.status, error?.code);
  }
  return json as T;
}

export type CheckoutSession = {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  client_reference_id: string | null;
  customer: string | null;
  subscription: string | null;
  metadata: Record<string, string> | null;
};

export type Subscription = {
  id: string;
  status: string;
  customer: string;
  metadata: Record<string, string> | null;
  items: { data: { price: { id: string; recurring: { interval: string } | null } }[] };
};

/** Statuses in which the agency has paid for Premium. */
export function subscriptionIsLive(status: string): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function subscriptionInterval(subscription: Subscription): BillingInterval | null {
  const interval = subscription.items.data[0]?.price.recurring?.interval;
  return isBillingInterval(interval) ? interval : null;
}

export function createPremiumCheckout(options: {
  agencyId: string;
  agencyName: string;
  interval: BillingInterval;
  email: string;
  customerId: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<CheckoutSession> {
  return stripe<CheckoutSession>("POST", "/checkout/sessions", {
    mode: "subscription",
    // Managed Payments is on by default for this account; this site sells
    // as Magic Hire Technologies itself.
    "managed_payments[enabled]": false,
    "line_items[0][price]": PREMIUM_PRICES[options.interval],
    "line_items[0][quantity]": 1,
    client_reference_id: options.agencyId,
    "metadata[agency_id]": options.agencyId,
    "subscription_data[metadata][agency_id]": options.agencyId,
    "subscription_data[description]": `RecruiterLink Premium: ${options.agencyName}`.slice(0, 500),
    customer: options.customerId ?? undefined,
    customer_email: options.customerId ? undefined : options.email,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${options.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: options.cancelUrl,
  });
}

export function getCheckoutSession(id: string): Promise<CheckoutSession> {
  return stripe<CheckoutSession>("GET", `/checkout/sessions/${encodeURIComponent(id)}`);
}

export function getSubscription(id: string): Promise<Subscription> {
  return stripe<Subscription>("GET", `/subscriptions/${encodeURIComponent(id)}`);
}

export async function createBillingPortal(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripe<{ url: string }>("POST", "/billing_portal/sessions", {
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

/**
 * Checks a webhook's `Stripe-Signature` header against the raw body and
 * returns the parsed event, or null when it does not match or is older than
 * five minutes.
 */
export function verifyWebhook<T>(
  rawBody: string,
  header: string | null,
  secret: string,
  now: number = Date.now(),
): T | null {
  if (!header) return null;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = Number(value);
    if (key === "v1" && value) signatures.push(value);
  }
  if (!timestamp || !Number.isFinite(timestamp) || signatures.length === 0) return null;
  if (Math.abs(now / 1000 - timestamp) > 300) return null;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  const matches = signatures.some((signature) => {
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!matches) return null;
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return null;
  }
}
