export async function onRequestPost(context) {
  return Response.json(
    {
      ok: false,
      error: "DEBUG_VERSION_7",
      note: "If you can see this, Cloudflare deployed the latest function.",
    },
    { status: 418 },
  );
}

export async function onRequest() {
  return Response.json(
    { error: "Method not allowed - DEBUG_VERSION_7" },
    { status: 405 },
  );
}
