export async function onRequestPost() {
  return Response.json(
    {
      ok: false,
      error:
        "This endpoint is no longer used. VIP payments now start from the IntaSend frontend SDK.",
    },
    { status: 410 },
  );
}

export async function onRequest() {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
