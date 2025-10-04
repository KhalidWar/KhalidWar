/**
 * Cloudflare Pages Function: apps-data.js
 * - Fetches iTunes API data for given appId
 * - Caches JSON response in KV (APPS_KV) for reliability
 * - Falls back to last cached data if fetch fails
 *
 * Binding needed in Dashboard:
 *   KV Namespace: APPS_KV
 */

const CACHE_TTL = 60 * 60 * 12; // 12 hours in seconds

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // Only GET allowed
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const appId = url.searchParams.get("id");

  if (!appId) {
    return jsonResponse({ error: "Missing app ID parameter" }, 400);
  }

  if (!/^\d+$/.test(appId)) {
    return jsonResponse({ error: "Invalid app ID format" }, 400);
  }

  const cacheKey = `app:${appId}`;

  try {
    // 1. Try KV cache first
    const cached = await env.APPS_KV.get(cacheKey, { type: "json" });
    if (cached && cached.fetchedAt > Date.now() - CACHE_TTL * 1000) {
      return jsonResponse(cached.data, 200, true); // true = served from cache
    }

    // 2. Fetch fresh data from iTunes
    const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}`;
    const response = await fetch(itunesUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; khalidwar.com/1.0)",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok)
      throw new Error(`iTunes API returned status: ${response.status}`);

    const data = await response.json();

    // 3. Save to KV
    await env.APPS_KV.put(
      cacheKey,
      JSON.stringify({ data, fetchedAt: Date.now() })
    );

    return jsonResponse(data, 200);
  } catch (error) {
    console.error("iTunes API Error:", error);

    // 4. Fallback: serve stale cache if available
    const cached = await env.APPS_KV.get(cacheKey, { type: "json" });
    if (cached) {
      return jsonResponse(cached.data, 200, true); // served from stale cache
    }

    return jsonResponse({ error: error.message }, 500);
  }
}

// --- Helpers ---
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonResponse(obj, status = 200, fromCache = false) {
  const headers = {
    ...corsHeaders(),
    "Content-Type": "application/json",
  };
  if (!fromCache) {
    headers["Cache-Control"] =
      "public, max-age=43200, stale-while-revalidate=86400";
  }
  return new Response(JSON.stringify(obj), { status, headers });
}
