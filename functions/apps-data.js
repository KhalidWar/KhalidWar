/**
 * Cloudflare Pages Function: apps-data.js
 * --------------------------------------------------------
 * Fetches iTunes App Store API data for a given app ID.
 * Caches the full raw JSON response in KV.
 *
 * Bindings required:
 *   KV Namespace: APPS_KV
 */

const CACHE_TTL = 60 * 60 * 12; // 12 hours in seconds

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
    // 1️⃣ Check cached data
    const cached = await env.APPS_KV.get(cacheKey, { type: "json" });
    if (cached && cached.fetchedAt > Date.now() - CACHE_TTL * 1000) {
      return jsonResponse(cached.data, 200, true);
    }

    // 2️⃣ Fetch fresh iTunes API data
    const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}`;
    const response = await fetch(itunesUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; khalidwar.com/1.0)",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) throw new Error(`iTunes API returned ${response.status}`);

    const rawData = await response.json();
    const app = rawData?.results?.[0];
    if (!app) throw new Error("App not found in iTunes response");

    // 3️⃣ Cache the full raw JSON response
    await env.APPS_KV.put(
      cacheKey,
      JSON.stringify({ data: rawData, fetchedAt: Date.now() })
    );

    // 4️⃣ Return the full raw JSON response
    return jsonResponse(rawData, 200);
  } catch (error) {
    console.error("App Store Fetch Error:", error);

    // 5️⃣ Fallback: try stale cached data
    const cached = await env.APPS_KV.get(cacheKey, { type: "json" });
    if (cached) return jsonResponse(cached.data, 200, true);

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
