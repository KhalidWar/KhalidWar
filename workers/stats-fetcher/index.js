/**
 * Cloudflare Worker: stats-fetcher
 *
 * Runs daily (cron trigger).
 * Fetches follower counts from public pages.
 * Writes results into KV (SOCIAL_KV).
 *
 * Bindings needed in Cloudflare Dashboard:
 *   KV Namespace: SOCIAL_KV
 */

export default {
  async scheduled(event, env, ctx) {
    const stats = await fetchAll();
    const now = new Date().toISOString();

    const payload = JSON.stringify({ updatedAt: now, ...stats });

    await env.SOCIAL_KV.put("latestCounts", payload);
    console.log("Social stats updated:", payload);
  },
};

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
 * Utility: parse formatted numbers like "12K"
 */
function parseNumber(str) {
  if (!str) return 0;
  str = str.replace(/[^0-9KM]/g, "");
  if (str.includes("K")) return Math.round(parseFloat(str) * 1000);
  if (str.includes("M")) return Math.round(parseFloat(str) * 1000000);
  return parseInt(str, 10);
}
