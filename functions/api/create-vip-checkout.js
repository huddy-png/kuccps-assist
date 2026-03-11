export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const data = await request.json();

    const bookingId = data.bookingId;
    const ticket = data.ticket;
    const amount = Number(data.amount || 0);
    const email = String(data.email || "").trim();
    let phone = String(data.phone || "").trim();
    const serviceName = data.serviceName || "VIP Booking";

    if (!bookingId || !ticket || !amount) {
      return new Response(
        JSON.stringify({ error: "bookingId, ticket and amount required" }),
        { status: 400 },
      );
    }

    // -------- Phone normalization --------
    phone = phone.replace(/\s+/g, "");

    if (phone.startsWith("+")) {
      phone = phone.slice(1);
    }

    if (phone.startsWith("0")) {
      phone = "254" + phone.slice(1);
    }

    const INTASEND_SECRET_KEY = env.INTASEND_SECRET_KEY;
    const INTASEND_PUBLISHABLE_KEY = env.INTASEND_PUBLISHABLE_KEY;
    const SITE_URL = env.SITE_URL || "https://kuccpsassist.online";

    if (!INTASEND_SECRET_KEY || !INTASEND_PUBLISHABLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing IntaSend keys in environment" }),
        { status: 500 },
      );
    }

    // -------- Correct IntaSend endpoint --------
    const payload = {
      public_key: INTASEND_PUBLISHABLE_KEY,
      amount: amount,
      currency: "KES",
      api_ref: ticket,
      email: email,
      phone_number: phone,
      comment: `VIP deposit for ${serviceName}`,
      redirect_url: `${SITE_URL}/ticket.html?ticket=${encodeURIComponent(ticket)}`,
    };

    const intasendRes = await fetch(
      "https://payment.intasend.com/api/v1/checkout/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INTASEND_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const result = await intasendRes.json();

    if (!intasendRes.ok) {
      return new Response(
        JSON.stringify({
          error:
            result?.detail ||
            result?.message ||
            result?.error ||
            "Payment creation failed",
          raw: result,
        }),
        { status: 400 },
      );
    }

    const paymentUrl =
      result.url || result.checkout_url || result.hosted_url || null;

    if (!paymentUrl) {
      return new Response(
        JSON.stringify({
          error: "Payment link was not returned by IntaSend",
          raw: result,
        }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        paymentUrl,
      }),
      { status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message || "Unexpected server error",
      }),
      { status: 500 },
    );
  }
}

export async function onRequest() {
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
  });
}
