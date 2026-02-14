/**
 * Cloudflare Pages Function: github-stats.js
 * --------------------------------------------------------
 * Reads cached GitHub stats SVGs from KV.
 * Data is populated by the github-stats-fetcher worker (runs daily).
 *
 * Endpoint: GET /api/v1/github-stats?type=stats|languages
 *
 * Bindings required:
 *   KV Namespace: GITHUB_KV
 */

export async function onRequest(context) {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  if (!type || !["stats", "languages"].includes(type)) {
    return new Response("Missing or invalid type parameter (stats|languages)", {
      status: 400,
    });
  }

  try {
    const svg = await env.GITHUB_KV.get(`svg:${type}`);

    if (!svg) {
      return new Response("No cached data yet", { status: 503 });
    }

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders(),
      },
    });
  } catch (error) {
    console.error("GitHub stats fetch error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}
