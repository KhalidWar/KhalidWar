/**
 * Cloudflare Worker: apps-fetcher
 *
 * Runs daily (cron trigger).
 * Fetches app data from iTunes API for all configured apps.
 * Writes results into KV (APPS_KV).
 *
 * Bindings needed in Cloudflare Dashboard:
 *   KV Namespace: APPS_KV
 */

// List of app IDs to fetch data for
const APP_IDS = [
  "6510931792", // Norwegian Cruise Line
  "441599004", // Huntington Mobile Banking
  "1547461270", // AddyManager
  "6602886816", // Bucketize
];

export default {
  async scheduled(event, env, ctx) {
    console.log("🔄 Starting daily apps data fetch...");
    await updateAppsData(env);
  },

  async fetch(request, env, ctx) {
    // Allow manual trigger via HTTP request
    await updateAppsData(env);
    return new Response("Apps data updated successfully", { status: 200 });
  },
};

async function updateAppsData(env) {
  const results = {
    success: [],
    errors: [],
    timestamp: new Date().toISOString(),
  };

  for (const appId of APP_IDS) {
    try {
      console.log(`📱 Fetching data for app ID: ${appId}`);

      // Fetch from iTunes API
      const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}`;
      const response = await fetch(itunesUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; khalidwar.com/1.0)",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!response.ok) {
        throw new Error(`iTunes API returned ${response.status}`);
      }

      const rawData = await response.json();
      const app = rawData?.results?.[0];

      if (!app) {
        throw new Error("App not found in iTunes response");
      }

      // Store in KV
      const cacheKey = `app:${appId}`;
      const cacheData = {
        data: rawData,
        fetchedAt: Date.now(),
        appName: app.trackName,
      };

      await env.APPS_KV.put(cacheKey, JSON.stringify(cacheData));

      results.success.push({
        appId,
        appName: app.trackName,
        screenshots: app.screenshotUrls?.length || 0,
      });

      console.log(`✅ Successfully cached ${app.trackName} (${appId})`);
    } catch (error) {
      console.error(`❌ Error fetching app ${appId}:`, error.message);
      results.errors.push({
        appId,
        error: error.message,
      });
    }
  }

  // Store summary in KV
  await env.APPS_KV.put("fetch-summary", JSON.stringify(results));

  console.log(
    `🎉 Apps fetch completed: ${results.success.length} success, ${results.errors.length} errors`
  );
  return results;
}
