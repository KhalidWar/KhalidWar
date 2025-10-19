/**
 * Cloudflare Pages Function: app-store-data.js
 * --------------------------------------------------------
 * Reads cached iTunes App Store API data from KV.
 * Data is populated by the app-store-fetcher worker (runs daily).
 *
 * Endpoint: GET /api/v1/app-store-data?id={appId}
 *
 * Bindings required:
 *   KV Namespace: APPS_KV
 */

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  // Only GET allowed
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const appId = url.searchParams.get("id");

  if (!appId) return jsonResponse({ error: "Missing app ID parameter" }, 400);

  if (!/^\d+$/.test(appId))
    return jsonResponse({ error: "Invalid app ID format" }, 400);

  const cacheKey = `app:${appId}`;

  try {
    // Read data from KV (populated by app-store-fetcher worker)
    const cached = await env.APPS_KV.get(cacheKey, { type: "json" });
    return jsonResponse(cached.data, 200, true);
  } catch (error) {
    console.error("KV Read Error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
}

/** Helper: CORS Headers */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

/** Helper: JSON Response */
function jsonResponse(obj, status = 200, fromCache = false) {
  const headers = {
    ...corsHeaders(),
    "Content-Type": "application/json",
  };
  if (!fromCache) {
    headers["Cache-Control"] =
      "public, max-age=43200, stale-while-revalidate=86400";
  }
  return new Response(JSON.stringify(obj, null, 2), { status, headers });
}
