import type { NextRequest } from "next/server";
import { syncSubscription } from "@/features/premium/sync";
import { getStripeWebhookSecret } from "@/lib/env";
import { verifyWebhook } from "@/lib/stripe";

type StripeEvent = {
  id: string;
  type: string;
  data: { object: { object?: string; id?: string; subscription?: string | null; mode?: string } };
};

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

/**
 * Stripe tells the site about Premium payments here. Set up by hand in the
 * Stripe dashboard (see CLAUDE.md). Every event only names a subscription;
 * its real state is read back from Stripe before anything changes.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const event = verifyWebhook<StripeEvent>(body, request.headers.get("stripe-signature"), getStripeWebhookSecret());
  if (!event) return new Response("Bad signature", { status: 400 });

  const object = event.data.object;
  let subscriptionId: string | null = null;
  if (event.type === "checkout.session.completed" && object.mode === "subscription") {
    subscriptionId = object.subscription ?? null;
  } else if (SUBSCRIPTION_EVENTS.has(event.type) && object.object === "subscription") {
    subscriptionId = object.id ?? null;
  }
  if (!subscriptionId) return Response.json({ received: true, ignored: true });

  try {
    const result = await syncSubscription(subscriptionId, { id: event.id, type: event.type });
    return Response.json({ received: true, premium: result?.premium ?? null });
  } catch (error) {
    // A 500 makes Stripe send the event again later.
    console.error("Stripe webhook failed:", event.type, event.id, error);
    return new Response("Could not record the event", { status: 500 });
  }
}
