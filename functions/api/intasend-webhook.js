export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const bodyText = await request.text();

    let payload = {};
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return Response.json(
        { ok: false, error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const expectedChallenge = env.INTASEND_WEBHOOK_CHALLENGE || "";
    const incomingChallenge =
      payload.challenge ||
      payload.webhook_challenge ||
      payload.challenge_code ||
      "";

    if (
      expectedChallenge &&
      incomingChallenge &&
      incomingChallenge !== expectedChallenge
    ) {
      return Response.json(
        { ok: false, error: "Webhook challenge mismatch" },
        { status: 403 },
      );
    }

    const invoice = payload.invoice || {};
    const collection = payload.collection || {};
    const transaction = payload.transaction || {};

    const ticket =
      invoice.api_ref ||
      collection.api_ref ||
      transaction.api_ref ||
      payload.api_ref ||
      null;

    const statusRaw =
      invoice.state ||
      collection.state ||
      transaction.state ||
      payload.state ||
      payload.status ||
      "";

    const status = String(statusRaw).toUpperCase();

    const trackingRef =
      transaction.tracking_id ||
      collection.tracking_id ||
      payload.tracking_id ||
      transaction.reference ||
      collection.reference ||
      payload.reference ||
      payload.id ||
      null;

    if (!ticket) {
      return Response.json(
        { ok: false, error: "Missing ticket/api_ref in webhook payload" },
        { status: 400 },
      );
    }

    let payment_status = "pending";
    let deposit_paid = false;

    if (["COMPLETE", "COMPLETED", "SUCCESS", "PAID"].includes(status)) {
      payment_status = "paid";
      deposit_paid = true;
    } else if (["FAILED", "CANCELLED", "CANCELED"].includes(status)) {
      payment_status = "failed";
      deposit_paid = false;
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return Response.json(
        { ok: false, error: "Missing Supabase server environment variables" },
        { status: 500 },
      );
    }

    const updateRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?ticket=eq.${encodeURIComponent(ticket)}`,
      {
        method: "PATCH",
        headers: {
          apikey: supabaseServiceRoleKey,
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          payment_status,
          deposit_paid,
          deposit_reference: trackingRef,
        }),
      },
    );

    const updateText = await updateRes.text();

    if (!updateRes.ok) {
      return Response.json(
        {
          ok: false,
          error: "Failed to update booking in Supabase",
          supabase_response: updateText,
        },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      ticket,
      payment_status,
      deposit_paid,
      deposit_reference: trackingRef,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err.message || "Unexpected webhook error",
      },
      { status: 500 },
    );
  }
}

export async function onRequestGet(context) {
  const challenge = context.env.INTASEND_WEBHOOK_CHALLENGE || "";
  return Response.json({
    ok: true,
    message: "IntaSend webhook endpoint is live",
    challenge,
  });
}

export async function onRequest() {
  return Response.json(
    { ok: false, error: "Method not allowed" },
    { status: 405 },
  );
}
