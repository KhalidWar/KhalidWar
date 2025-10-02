export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
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

  // Only allow GET requests
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const url = new URL(request.url);
  const appId = url.searchParams.get("id");

  if (!appId) {
    return new Response(JSON.stringify({ error: "Missing app ID parameter" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Validate appId is numeric
  if (!/^\d+$/.test(appId)) {
    return new Response(JSON.stringify({ error: "Invalid app ID format" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}`;
    const response = await fetch(itunesUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; khalidwar.com/1.0)",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`iTunes API returned status: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=43200, stale-while-revalidate=86400",
        "CDN-Cache-Control": "public, max-age=43200",
      },
    });
  } catch (error) {
    console.error("iTunes API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
