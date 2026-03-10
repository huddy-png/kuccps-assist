export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    const bookingId = data.bookingId;
    const ticket = data.ticket;
    const amount = Number(data.amount || 0);
    const email = data.email || "";
    const phone = data.phone || "";
    const serviceName = data.serviceName || "VIP Booking";

    if (!bookingId || !ticket || !amount) {
      return Response.json(
        {
          error: "bookingId, ticket and amount required",
        },
        { status: 400 },
      );
    }

    const INTASEND_SECRET_KEY = env.INTASEND_SECRET_KEY;
    const INTASEND_PUBLISHABLE_KEY = env.INTASEND_PUBLISHABLE_KEY;
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
    const SITE_URL = env.SITE_URL || "https://kuccpsassist.online";

    if (
      !INTASEND_SECRET_KEY ||
      !INTASEND_PUBLISHABLE_KEY ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return Response.json(
        {
          error: "Missing required environment variables",
        },
        { status: 500 },
      );
    }

    const intasendRes = await fetch(
      "https://payment.intasend.com/api/v1/checkout/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INTASEND_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_key: INTASEND_PUBLISHABLE_KEY,
          amount,
          currency: "KES",
          api_ref: ticket,
          email,
          phone_number: phone,
          redirect_url: `${SITE_URL}/ticket.html?ticket=${encodeURIComponent(ticket)}`,
          comment: `VIP deposit for ${serviceName}`,
        }),
      },
    );

    const result = await intasendRes.json();

    if (!intasendRes.ok) {
      return Response.json(
        {
          error:
            result?.detail || result?.message || "Failed to create checkout",
          raw: result,
        },
        { status: 400 },
      );
    }

    const paymentUrl =
      result.url || result.checkout_url || result.hosted_url || null;

    const invoiceId =
      result.invoice_id || result.id || result.invoice?.invoice_id || null;

    if (!paymentUrl) {
      return Response.json(
        {
          error: "Payment link was not returned by IntaSend",
          raw: result,
        },
        { status: 500 },
      );
    }

    const bookingUpdateRes = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          payment_status: "pending",
          payment_provider: "intasend",
          payment_invoice_id: invoiceId,
          payment_amount: amount,
          payment_currency: "KES",
          vip_payment_url: paymentUrl,
        }),
      },
    );

    if (!bookingUpdateRes.ok) {
      const text = await bookingUpdateRes.text();
      return Response.json(
        {
          error: "Checkout created, but failed to update booking",
          details: text,
        },
        { status: 500 },
      );
    }

    await fetch(`${SUPABASE_URL}/rest/v1/booking_payments`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        booking_id: bookingId,
        provider: "intasend",
        invoice_id: invoiceId,
        api_ref: ticket,
        amount,
        currency: "KES",
        status: "pending",
        raw_payload: result,
      }),
    });

    return Response.json({
      ok: true,
      paymentUrl,
      invoiceId,
    });
  } catch (err) {
    return Response.json(
      {
        error: err.message || "Unexpected server error",
      },
      { status: 500 },
    );
  }
}

export async function onRequest(context) {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
