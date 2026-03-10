export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    const bookingId = data.bookingId;
    const ticket = data.ticket;
    const amount = Number(data.amount || 0);
    const email = (data.email || "").trim();
    const phone = (data.phone || "").trim();
    const serviceName = data.serviceName || "VIP Booking";

    if (!bookingId || !ticket || !amount) {
      return Response.json(
        { error: "bookingId, ticket and amount required" },
        { status: 400 },
      );
    }

    const INTASEND_SECRET_KEY = env.INTASEND_SECRET_KEY;
    const INTASEND_PUBLISHABLE_KEY = env.INTASEND_PUBLISHABLE_KEY;
    const SITE_URL = env.SITE_URL || "https://kuccpsassist.online";

    if (!INTASEND_SECRET_KEY || !INTASEND_PUBLISHABLE_KEY) {
      return Response.json(
        { error: "Missing IntaSend environment variables" },
        { status: 500 },
      );
    }

    const payload = {
      public_key: INTASEND_PUBLISHABLE_KEY,
      amount,
      currency: "KES",
      api_ref: ticket,
      email: email || undefined,
      phone_number: phone || undefined,
      host: SITE_URL,
      redirect_url: `${SITE_URL}/ticket.html?ticket=${encodeURIComponent(ticket)}`,
      comment: `VIP deposit for ${serviceName}`,
      method: "M-PESA",
      mobile_tarrif: "CUSTOMER-PAYS",
    };

    const intasendRes = await fetch(
      "https://api.intasend.com/api/v1/checkout/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INTASEND_SECRET_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const text = await intasendRes.text();

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }

    if (!intasendRes.ok) {
      return Response.json(
        {
          error:
            result?.detail ||
            result?.message ||
            result?.raw ||
            "IntaSend checkout failed",
          raw: result,
          sent_payload: payload,
        },
        { status: 400 },
      );
    }

    const paymentUrl =
      result.url || result.checkout_url || result.hosted_url || null;

    if (!paymentUrl) {
      return Response.json(
        {
          error: "Payment link was not returned by IntaSend",
          raw: result,
        },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      paymentUrl,
      raw: result,
    });
  } catch (err) {
    return Response.json(
      { error: err.message || "Unexpected server error" },
      { status: 500 },
    );
  }
}

export async function onRequest() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
