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
    await updateStats(env);
  },

  async fetch(request, env, ctx) {
    await updateStats(env);
    return new Response("Stats updated successfully", { status: 200 });
  },
};

/**
 * Update stats and store in KV
 * Only updates values that were successfully fetched (non-zero)
 * Preserves existing values if fetch fails or returns 0
 */
async function updateStats(env) {
  const newStats = await fetchAll();
  const now = new Date().toISOString();

  // Fetch existing data from KV
  const existingData = await env.SOCIAL_KV.get("latestCounts", "json");
  const existingStats = existingData || {};

  // Merge: only update if new value is valid (> 0 and no error)
  const mergedStats = {
    youtube: mergeStatsField(
      existingStats.youtube,
      newStats.youtube,
      "subscribers"
    ),
    instagram: mergeStatsField(
      existingStats.instagram,
      newStats.instagram,
      "followers"
    ),
    tiktok: mergeStatsField(existingStats.tiktok, newStats.tiktok, "followers"),
    twitter: mergeStatsField(
      existingStats.twitter,
      newStats.twitter,
      "followers"
    ),
  };

  const payload = { updatedAt: now, ...mergedStats };

  await env.SOCIAL_KV.put("latestCounts", JSON.stringify(payload));
  console.log("Social stats updated:", JSON.stringify(payload));
  console.log(
    "Preserved values:",
    getPreservedFields(existingStats, mergedStats)
  );
}

/**
 * Merge a single platform's stats
 * Returns new stats if valid, otherwise keeps existing stats
 */
function mergeStatsField(existingField, newField, countKey) {
  // If new field has error or zero value, keep existing
  if (!newField || newField.error || newField[countKey] === 0) {
    if (existingField && existingField[countKey] > 0) {
      return existingField; // Keep existing valid value
    }
  }

  // Otherwise use new value
  return newField;
}

/**
 * Log which fields were preserved from existing data
 */
function getPreservedFields(existing, merged) {
  const preserved = [];

  if (existing.youtube && merged.youtube === existing.youtube) {
    preserved.push("youtube");
  }
  if (existing.instagram && merged.instagram === existing.instagram) {
    preserved.push("instagram");
  }
  if (existing.tiktok && merged.tiktok === existing.tiktok) {
    preserved.push("tiktok");
  }
  if (existing.twitter && merged.twitter === existing.twitter) {
    preserved.push("twitter");
  }

  return preserved.length > 0 ? preserved.join(", ") : "none";
}

/**
 * Fetch all platforms
 */
async function fetchAll() {
  const results = await Promise.allSettled([
    fetchYouTube("khalidwar"),
    fetchInstagram("khalidwars"),
    fetchTikTok("khalidwarsa"),
    fetchTwitter("KhalidWarsa"),
  ]);

  return {
    youtube:
      results[0].status === "fulfilled"
        ? results[0].value
        : { subscribers: 0, error: results[0].reason?.message },
    instagram:
      results[1].status === "fulfilled"
        ? results[1].value
        : { followers: 0, error: results[1].reason?.message },
    tiktok:
      results[2].status === "fulfilled"
        ? results[2].value
        : { followers: 0, error: results[2].reason?.message },
    twitter:
      results[3].status === "fulfilled"
        ? results[3].value
        : { followers: 0, error: results[3].reason?.message },
  };
}

/**
 * --- Platform fetch helpers ---
 */
async function fetchYouTube(handle) {
  try {
    const res = await fetch(`https://www.youtube.com/@${handle}/about`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const text = await res.text();

    // Try multiple patterns
    let match = text.match(/"subscriberCountText":\{"simpleText":"([^"]+)"\}/);
    if (!match) {
      match = text.match(/(\d+(?:\.\d+)?[KM]?) subscribers/i);
    }

    return { subscribers: match ? parseNumber(match[1]) : 0 };
  } catch (error) {
    console.error("YouTube fetch error:", error.message);
    return { subscribers: 0, error: error.message };
  }
}

async function fetchInstagram(handle) {
  try {
    const res = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const text = await res.text();

    // Try multiple patterns
    let match = text.match(/"edge_followed_by":\{"count":(\d+)\}/);
    if (!match) {
      match = text.match(/"follower_count":(\d+)/);
    }

    return { followers: match ? Number(match[1]) : 0 };
  } catch (error) {
    console.error("Instagram fetch error:", error.message);
    return { followers: 0, error: error.message };
  }
}

async function fetchTikTok(handle) {
  try {
    const res = await fetch(`https://www.tiktok.com/@${handle}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const text = await res.text();

    let match = text.match(/"followerCount":(\d+)/);
    if (!match) {
      match = text.match(/"stats":\{[^}]*"followerCount":(\d+)/);
    }

    return { followers: match ? Number(match[1]) : 0 };
  } catch (error) {
    console.error("TikTok fetch error:", error.message);
    return { followers: 0, error: error.message };
  }
}

async function fetchTwitter(handle) {
  try {
    const res = await fetch(`https://x.com/${handle}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    const text = await res.text();

    let match = text.match(/"followers_count":(\d+)/);
    if (!match) {
      match = text.match(/"normal_followers_count":"(\d+)"/);
    }

    return { followers: match ? Number(match[1]) : 0 };
  } catch (error) {
    console.error("Twitter fetch error:", error.message);
    return { followers: 0, error: error.message };
  }
}

/**
 * Utility: parse formatted numbers like "12K", "1.5M", "1,234"
 */
function parseNumber(str) {
  if (!str) return 0;

  // Remove commas
  str = str.replace(/,/g, "");

  // Handle K and M suffixes
  if (str.includes("K") || str.includes("k")) {
    return Math.round(parseFloat(str) * 1000);
  }
  if (str.includes("M") || str.includes("m")) {
    return Math.round(parseFloat(str) * 1000000);
  }

  return parseInt(str, 10) || 0;
}
