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
    const incomingChallenge = String(payload.challenge || expectedChallenge);

    if (expectedChallenge && incomingChallenge !== expectedChallenge) {
      return Response.json(
        {
          ok: false,
          error: "Webhook challenge mismatch",
          received: incomingChallenge,
        },
        { status: 403 },
      );
    }

    const ticket = String(payload.api_ref || "").trim();
    const state = String(payload.state || "")
      .trim()
      .toUpperCase();

    const trackingRef =
      payload.invoice_id ||
      payload.mpesa_reference ||
      payload.provider_ref ||
      payload.id ||
      null;

    if (!ticket) {
      return Response.json(
        {
          ok: false,
          error: "Missing api_ref in webhook payload",
          payload,
        },
        { status: 400 },
      );
    }

    let payment_status = "pending";
    let deposit_paid = false;

    if (state === "COMPLETE") {
      payment_status = "paid";
      deposit_paid = true;
    } else if (state === "FAILED") {
      payment_status = "failed";
      deposit_paid = false;
    } else if (
      state === "PROCESSING" ||
      state === "PENDING" ||
      state === "CLEARING"
    ) {
      payment_status = "pending";
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

    const updateUrl = `${supabaseUrl}/rest/v1/bookings?ticket=eq.${ticket}`;

    const updateRes = await fetch(updateUrl, {
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
    });

    const updateText = await updateRes.text();

    if (!updateRes.ok) {
      return Response.json(
        {
          ok: false,
          error: "Failed to update booking in Supabase",
          supabase_response: updateText,
          ticket,
          state,
          updateUrl,
        },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      ticket,
      state,
      payment_status,
      deposit_paid,
      deposit_reference: trackingRef,
      supabase_response: updateText,
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
