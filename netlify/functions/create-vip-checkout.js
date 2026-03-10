exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const data = JSON.parse(event.body);

    const bookingId = data.bookingId;
    const ticket = data.ticket;
    const amount = data.amount;

    if (!bookingId || !ticket || !amount) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "bookingId, ticket and amount required",
        }),
      };
    }

    const INTASEND_SECRET_KEY = process.env.INTASEND_SECRET_KEY;
    const INTASEND_PUBLISHABLE_KEY = process.env.INTASEND_PUBLISHABLE_KEY;

    const response = await fetch(
      "https://payment.intasend.com/api/v1/checkout/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${INTASEND_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_key: INTASEND_PUBLISHABLE_KEY,
          amount: amount,
          currency: "KES",
          api_ref: ticket,
        }),
      },
    );

    const result = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        paymentUrl: result.url,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message,
      }),
    };
  }
};
