/**
 * Cloudflare Pages Function: social-media-stats.js
 * --------------------------------------------------------
 * Reads cached social media follower counts from KV.
 * Data is populated by the social-stats-fetcher worker (runs daily).
 *
 * Endpoint: GET /api/v1/social-media-stats
 *
 * Bindings required:
 *   KV Namespace: SOCIAL_KV
 */

export async function onRequest(context) {
  const { env } = context;

  // Handle CORS preflight
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Only GET allowed
  if (context.request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Serve cached stats from KV
    const latest = await env.SOCIAL_KV.get("latestCounts");
    if (latest) {
      return new Response(latest, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // No cached data yet
    return new Response(JSON.stringify({ error: "No cached data yet" }), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Social stats fetch error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
