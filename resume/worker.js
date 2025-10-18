// Mock resume data
const MOCK_RESUME = {
  name: "Khalid Warsame",
  title: "Mobile App Developer",
  summary:
    "Results-driven mobile app developer with 4+ years of experience building high-quality apps using Flutter. Developed cross-platform apps that enhanced the guest experience for millions of users across 20 cruise ships, contributed to $10M+ in revenue, and helped a startup secure $100K in funding with a successful MVP launch.",
  skills:
    "Flutter, Dart, Firebase, Supabase, REST APIs, iOS, Android, UI/UX Design, State Management, Cross-Platform Development",
  experience:
    "ABC Cruise Line - Full Time\nMobile App Developer\nAug 2022 - Present | Miami, Florida\n• Designed and launched cross-platform Android and iOS apps, enhancing the guest experience for millions of users\n• Engineered custom solutions for seamless app connectivity with 90% uptime\n• Modularized 80% of UI components, accelerating development timelines by 50%\n• Contributed to $10M+ in revenue through the app launch\n\nHuntington National Bank - Contract\nMobile App Developer\nMar 2022 - Jul 2022 | Columbus, Ohio\n• Developed a secure banking app for Android and iOS with 100% test coverage\n• Implemented resilient, secure code ensuring zero data breaches\n• Collaborated with cross-functional teams to enhance consumer-facing apps for millions of users\n\nFreelance & Consultancy - Remote\nMobile App Developer\nOct 2020 - Present\n• Developed an MVP for a real estate startup, enabling them to secure $100K in funding\n• Built and published personal mobile apps, generating $3K+ in passive revenue\n• Managed end-to-end development of multiple apps, delivering 98% crash-free rate",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check endpoint
    if (url.pathname === "/health" && request.method === "GET") {
      return new Response(
        JSON.stringify({ status: "OK", timestamp: Date.now() }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // GET (public)
    if (url.pathname === "/resume" && request.method === "GET") {
      try {
        // Try to get from KV first
        const data = await env.RESUME_DATA.get("khalid_resume");
        if (data) {
          return new Response(data, {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300, s-maxage=300", // 5 min cache
            },
          });
        }
      } catch (error) {
        console.warn("KV error:", error);
      }

      // Return mock data as fallback
      return new Response(JSON.stringify(MOCK_RESUME), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST (protected)
    if (url.pathname === "/resume" && request.method === "POST") {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${env.UPDATE_TOKEN}`) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limiting: Check last save time
      const clientIP = request.headers.get("CF-Connecting-IP") || "unknown";
      const rateLimitKey = `ratelimit_${clientIP}`;
      const lastSave = await env.RESUME_DATA.get(rateLimitKey);
      const now = Date.now();

      if (lastSave && now - parseInt(lastSave) < 1000) {
        // 1 second rate limit
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate JSON
      const body = await request.text();
      let resumeData;
      try {
        resumeData = JSON.parse(body);
      } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate required fields
      const requiredFields = ["name", "contact", "summary"];
      for (const field of requiredFields) {
        if (!resumeData[field]) {
          return new Response(
            JSON.stringify({ error: `Missing required field: ${field}` }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      // Save resume with TTL
      await env.RESUME_DATA.put("khalid_resume", body, {
        expirationTtl: 31536000, // 1 year
      });

      // Update rate limit
      await env.RESUME_DATA.put(rateLimitKey, now.toString(), {
        expirationTtl: 60, // Expire after 1 minute
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Resume saved successfully",
          timestamp: now,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};
