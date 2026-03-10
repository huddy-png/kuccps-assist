export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const payload = await request.json();

    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 },
      );
    }

    const invoiceId =
      payload.invoice_id || payload.invoice?.invoice_id || payload.id || null;

    const apiRef = payload.api_ref || payload.invoice?.api_ref || null;

    const stateRaw =
      payload.state ||
      payload.status ||
      payload.invoice?.state ||
      payload.invoice?.status ||
      "";

    const state = String(stateRaw).toLowerCase();

    let mappedStatus = "pending";
    let markPaid = false;

    if (
      state.includes("complete") ||
      state.includes("success") ||
      state.includes("paid")
    ) {
      mappedStatus = "paid";
      markPaid = true;
    } else if (
      state.includes("fail") ||
      state.includes("cancel") ||
      state.includes("declin")
    ) {
      mappedStatus = "failed";
    }

    if (invoiceId) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/booking_payments?invoice_id=eq.${encodeURIComponent(invoiceId)}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            status: mappedStatus,
            reference:
              payload.reference ||
              payload.tracking_id ||
              payload.checkout_id ||
              null,
            raw_payload: payload,
            updated_at: new Date().toISOString(),
          }),
        },
      );
    }

    if (markPaid && apiRef) {
      await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?ticket=eq.${encodeURIComponent(apiRef)}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            deposit_paid: true,
            payment_status: "paid",
            payment_reference:
              payload.reference ||
              payload.tracking_id ||
              payload.checkout_id ||
              null,
            payment_paid_at: new Date().toISOString(),
          }),
        },
      );
    }

    return new Response("Webhook received successfully", { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Webhook processing failed",
      },
      { status: 500 },
    );
  }
}

export async function onRequest() {
  return new Response("Method not allowed", { status: 405 });
}
