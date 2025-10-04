/**
 * Cloudflare Pages Function: stats.js
 *
 * Reads cached social follower counts from KV (SOCIAL_KV).
 * Frontend calls `/stats` to get the latest JSON.
 */

export async function onRequest(context) {
  const { env } = context;

  // Serve cached stats from KV
  const latest = await env.SOCIAL_KV.get("latestCounts");
  if (latest) {
    return new Response(latest, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // No cached data yet
  return new Response(JSON.stringify({ error: "No cached data yet" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}
