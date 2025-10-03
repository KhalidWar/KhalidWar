/**
 * Cloudflare Pages Function: stats.js
 *
 *  - Fetches social follower counts from public pages
 *  - Stores in KV (SOCIAL_KV) so frontend always has last known good data
 *  - Run daily via Cron Trigger
 *
 * Bindings needed in Cloudflare Dashboard:
 *  - KV Namespace: SOCIAL_KV
 */

// Cloudflare Pages Function at /stats
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

// Scheduled handler for cron trigger
export async function onScheduled(event, env, ctx) {
  const stats = await fetchAll();
  const now = new Date().toISOString();

  const payload = JSON.stringify({ updatedAt: now, ...stats });

  // Save to KV
  await env.SOCIAL_KV.put("latestCounts", payload);

  console.log("Social stats updated:", payload);
}

/**
 * Fetch all platforms
 */
async function fetchAll() {
  return {
    youtube: await fetchYouTube("khalidwar"),
    instagram: await fetchInstagram("khalidwars"),
    tiktok: await fetchTikTok("khalidwarsa"),
    twitter: await fetchTwitter("KhalidWarsa"),
    linkedin: await fetchLinkedIn("khalidwar"),
  };
}

/**
 * --- Platform fetch helpers ---
 * These parse publicly available data from profile pages.
 * You may need to adjust selectors if platforms change markup.
 */

async function fetchYouTube(handle) {
  const res = await fetch(`https://www.youtube.com/@${handle}/about`);
  const text = await res.text();

  const match = text.match(/"subscriberCountText":\{"simpleText":"([^"]+)"\}/);
  return { subscribers: match ? parseNumber(match[1]) : 0 };
}

async function fetchInstagram(handle) {
  const res = await fetch(`https://www.instagram.com/${handle}/`);
  const text = await res.text();

  const match = text.match(/"edge_followed_by":\{"count":(\d+)\}/);
  return { followers: match ? Number(match[1]) : 0 };
}

async function fetchTikTok(handle) {
  const res = await fetch(`https://www.tiktok.com/@${handle}`);
  const text = await res.text();

  const match = text.match(/"followerCount":(\d+)/);
  return { followers: match ? Number(match[1]) : 0 };
}

async function fetchTwitter(handle) {
  const res = await fetch(`https://x.com/${handle}`);
  const text = await res.text();

  const match = text.match(/"followers_count":(\d+)/);
  return { followers: match ? Number(match[1]) : 0 };
}

async function fetchLinkedIn(handle) {
  const res = await fetch(`https://www.linkedin.com/in/${handle}/`);
  const text = await res.text();

  const match = text.match(/"followers":(\d+)/);
  return { followers: match ? Number(match[1]) : 0 };
}

/**
 * Utility: Parse formatted numbers like "12K subscribers"
 */
function parseNumber(str) {
  if (!str) return 0;
  str = str.replace(/[^0-9KM]/g, "");
  if (str.includes("K")) return Math.round(parseFloat(str) * 1000);
  if (str.includes("M")) return Math.round(parseFloat(str) * 1000000);
  return parseInt(str, 10);
}
