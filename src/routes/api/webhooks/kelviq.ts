import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Kelviq webhook signature verification (if they provide one)
// For now, we'll use event ID deduplication

const KELVIQ_WEBHOOK_SECRET = process.env["KELVIQ_WEBHOOK_SECRET"] ?? "";

export const Route = createFileRoute("/api/webhooks/kelviq")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as KelviqWebhookEvent;

          // Verify webhook secret if configured
          const signature = request.headers.get("x-kelviq-signature");
          if (KELVIQ_WEBHOOK_SECRET && signature) {
            // TODO: Implement signature verification when Kelviq provides documentation
            // const expectedSignature = crypto.createHmac('sha256', KELVIQ_WEBHOOK_SECRET)
            //   .update(JSON.stringify(body))
            //   .digest('hex');
            // if (signature !== expectedSignature) {
            //   return new Response("Invalid signature", { status: 401 });
            // }
          }

          const supabaseUrl = process.env["SUPABASE_URL"] ?? (import.meta.env["VITE_SUPABASE_URL"] as string | undefined);
          const supabaseKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? ((import.meta.env["VITE_SUPABASE_SERVICE_ROLE_KEY"] ?? import.meta.env["VITE_SUPABASE_ANON_KEY"]) as string | undefined);

          if (!supabaseUrl || !supabaseKey) {
            return new Response("Database configuration missing", { status: 500 });
          }

          const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          // Check for duplicate event (idempotency)
          const { data: existingEvent } = await supabase
            .from("subscription_events")
            .select("id")
            .eq("kelviq_event_id", body.id)
            .maybeSingle();

          if (existingEvent) {
            console.log(`[Kelviq] Duplicate event ${body.id}, skipping`);
            return new Response("Event already processed", { status: 200 });
          }

          // Store the event
          const { error: eventError } = await supabase.from("subscription_events").insert({
            kelviq_event_id: body.id,
            event_type: body.type,
            event_data: body.data as never,
            processed: false,
          });

          if (eventError) {
            console.error("[Kelviq] Failed to store event:", eventError);
            return new Response("Failed to store event", { status: 500 });
          }

          // Process the event based on type
          await processKelviqEvent(body, supabase);

          // Mark event as processed
          await supabase
            .from("subscription_events")
            .update({ processed: true, processed_at: new Date().toISOString() })
            .eq("kelviq_event_id", body.id);

          return new Response("Webhook processed", { status: 200 });
        } catch (error) {
          console.error("[Kelviq] Webhook error:", error);
          return new Response("Webhook processing failed", { status: 500 });
        }
      },
    },
  },
});

async function processKelviqEvent(event: KelviqWebhookEvent, supabase: ReturnType<typeof createClient<Database>>) {
  const eventType = event.type;
  const data = event.data;

  switch (eventType) {
    case "checkout.completed":
    case "subscription.created": {
      // New subscription created
      const planIdentifier = data.plan_identifier as string;
      const customerId = data.customer_id as string;
      const subscriptionId = data.subscription_id as string;

      // Map Kelviq plan identifiers to our plans
      const plan = planIdentifier === "pro-plan" ? "pro" : "standard";

      // Get org_id from metadata
      const orgId = data.metadata?.org_id as string;

      if (!orgId) {
        console.error("[Kelviq] No org_id in metadata, cannot link subscription");
        return;
      }

      // Create or update subscription
      const { error: subError } = await supabase.from("subscriptions").upsert({
        org_id: orgId,
        kelviq_customer_id: customerId,
        kelviq_subscription_id: subscriptionId,
        plan,
        status: "active",
        charge_period: data.charge_period as string || "MONTHLY",
        trial_end_at: data.trial_end ? new Date(data.trial_end as string).toISOString() : null,
        current_period_end: data.current_period_end ? new Date(data.current_period_end as string).toISOString() : null,
        metadata: data.metadata as never,
      }, {
        onConflict: "kelviq_subscription_id"
      });

      if (subError) {
        console.error("[Kelviq] Failed to create subscription:", subError);
      }

      // Update user's profile plan
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ plan })
        .eq("org_id", orgId);

      if (profileError) {
        console.error("[Kelviq] Failed to update profile plan:", profileError);
      }
      break;
    }

    case "subscription.updated": {
      // Subscription updated (plan change, etc.)
      const subscriptionId = data.subscription_id as string;
      const planIdentifier = data.plan_identifier as string;
      const plan = planIdentifier === "pro-plan" ? "pro" : "standard";

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          plan,
          status: data.status as string || "active",
          current_period_end: data.current_period_end ? new Date(data.current_period_end as string).toISOString() : null,
          cancel_at_period_end: data.cancel_at_period_end as boolean || false,
          metadata: data.metadata as never,
        })
        .eq("kelviq_subscription_id", subscriptionId);

      if (updateError) {
        console.error("[Kelviq] Failed to update subscription:", updateError);
      }

      // Update user's profile plan
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("org_id")
        .eq("kelviq_subscription_id", subscriptionId)
        .single();

      if (subscription) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ plan })
          .eq("org_id", subscription.org_id);

        if (profileError) {
          console.error("[Kelviq] Failed to update profile plan:", profileError);
        }
      }
      break;
    }

    case "subscription.cancelled": {
      // Subscription cancelled
      const subscriptionId = data.subscription_id as string;

      const { error: cancelError } = await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancel_at_period_end: data.cancel_at_period_end as boolean || false,
        })
        .eq("kelviq_subscription_id", subscriptionId);

      if (cancelError) {
        console.error("[Kelviq] Failed to cancel subscription:", cancelError);
      }

      // Update user's profile plan to standard (downgrade to basic)
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("org_id")
        .eq("kelviq_subscription_id", subscriptionId)
        .single();

      if (subscription) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ plan: "standard" })
          .eq("org_id", subscription.org_id);

        if (profileError) {
          console.error("[Kelviq] Failed to update profile plan on cancel:", profileError);
        }
      }
      break;
    }

    case "payment.succeeded":
    case "invoice.paid": {
      // Payment succeeded - update subscription status if needed
      const subscriptionId = data.subscription_id as string;

      const { error: paymentError } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: data.current_period_end ? new Date(data.current_period_end as string).toISOString() : null,
        })
        .eq("kelviq_subscription_id", subscriptionId);

      if (paymentError) {
        console.error("[Kelviq] Failed to update subscription after payment:", paymentError);
      }
      break;
    }

    case "payment.failed":
    case "invoice.payment_failed": {
      // Payment failed - mark as past_due
      const subscriptionId = data.subscription_id as string;

      const { error: failError } = await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
        })
        .eq("kelviq_subscription_id", subscriptionId);

      if (failError) {
        console.error("[Kelviq] Failed to mark subscription as past_due:", failError);
      }
      break;
    }

    default:
      console.log(`[Kelviq] Unhandled event type: ${eventType}`);
  }
}

interface KelviqWebhookEvent {
  id: string;
  type: string;
  data: {
    plan_identifier?: string;
    customer_id?: string;
    subscription_id?: string;
    customer_email?: string;
    charge_period?: string;
    trial_end?: string;
    current_period_end?: string;
    status?: string;
    cancel_at_period_end?: boolean;
    metadata?: Record<string, unknown>;
  };
  created_at: string;
}
