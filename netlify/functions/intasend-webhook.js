exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method not allowed",
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");

    console.log("IntaSend webhook received:", payload);

    return {
      statusCode: 200,
      body: "Webhook received successfully",
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Webhook processing failed",
      }),
    };
  }
};
