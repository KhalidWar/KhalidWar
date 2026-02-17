/**
 * Cloudflare Worker: github-stats-fetcher
 *
 * Runs daily (cron trigger).
 * Fetches GitHub stats via REST API (unauthenticated).
 * Generates SVG cards and writes them to KV (GITHUB_KV).
 *
 * Bindings needed in Cloudflare Dashboard:
 *   KV Namespace: GITHUB_KV
 */

const USERNAME = "KhalidWar";
const TOP_LANGS_COUNT = 3;

export default {
  async scheduled(event, env, ctx) {
    await updateStats(env);
  },

  async fetch(request, env, ctx) {
    await updateStats(env);
    return new Response("GitHub stats updated successfully", { status: 200 });
  },
};

async function updateStats(env) {
  const headers = {
    "User-Agent": "khalidwar-stats-worker",
    Accept: "application/vnd.github.v3+json",
  };

  // Fetch repos once, share between stats and languages
  const repos = await fetchAllRepos(headers);

  // Abort if repo fetch failed — prevents caching bad values (e.g. 0 stars)
  if (repos.length === 0) {
    console.log("GitHub stats skipped: repo fetch returned empty (likely rate-limited)");
    return;
  }

  const [stats, languages] = await Promise.allSettled([
    fetchUserStats(headers, repos),
    fetchTopLanguages(headers, repos),
  ]);

  const existingStats = await env.GITHUB_KV.get("stats:json", "json");

  // Merge: only update if fetch succeeded
  const mergedStats = {
    ...(existingStats || {}),
    ...(stats.status === "fulfilled" ? { stats: stats.value } : {}),
    ...(languages.status === "fulfilled"
      ? { languages: languages.value }
      : {}),
    updatedAt: new Date().toISOString(),
  };

  // Generate SVGs from merged data
  const statsSvg = mergedStats.stats
    ? generateStatsCard(mergedStats.stats)
    : null;
  const langsSvg = mergedStats.languages
    ? generateLanguagesCard(mergedStats.languages)
    : null;

  // Write to KV
  await env.GITHUB_KV.put("stats:json", JSON.stringify(mergedStats));
  if (statsSvg) await env.GITHUB_KV.put("svg:stats", statsSvg);
  if (langsSvg) await env.GITHUB_KV.put("svg:languages", langsSvg);

  console.log("GitHub stats updated:", JSON.stringify(mergedStats));

}

// --- Data Fetching ---

async function fetchAllRepos(headers) {
  const repos = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}`,
      { headers }
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    repos.push(...data);
    if (data.length < 100) break;
    page++;
  }

  return repos;
}

async function fetchUserStats(headers, repos) {
  const [commits, prs] = await Promise.all([
    fetch(
      `https://api.github.com/search/commits?q=author:${USERNAME}&per_page=1`,
      {
        headers: { ...headers, Accept: "application/vnd.github.cloak-preview+json" },
      }
    ).then((r) => r.json()),
    fetch(
      `https://api.github.com/search/issues?q=author:${USERNAME}+type:pr&per_page=1`,
      { headers }
    ).then((r) => r.json()),
  ]);

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);

  return {
    stars: totalStars,
    commits: commits.total_count || 0,
    prs: prs.total_count || 0,
  };
}

async function fetchTopLanguages(headers, repos) {
  const langTotals = {};

  const langPromises = repos
    .filter((r) => !r.fork && r.language)
    .map((r) =>
      fetch(r.languages_url, { headers })
        .then((res) => res.json())
        .then((langs) => {
          for (const [lang, bytes] of Object.entries(langs)) {
            langTotals[lang] = (langTotals[lang] || 0) + bytes;
          }
        })
        .catch(() => {})
    );

  await Promise.all(langPromises);

  const sorted = Object.entries(langTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_LANGS_COUNT);

  const total = sorted.reduce((sum, [, bytes]) => sum + bytes, 0);

  return sorted.map(([name, bytes]) => ({
    name,
    percentage: ((bytes / total) * 100).toFixed(1),
    color: LANG_COLORS[name] || "#858585",
  }));
}

// --- SVG Generation ---
// Design tokens from khalidwar.com portfolio
const FONT = "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const CARD_BG = "#f5f5f5";
const CARD_BORDER = "#e5e5e5";
const BORDER_RADIUS = 12;
const TEXT_PRIMARY = "#000000";
const TEXT_SECONDARY = "#525252";
const TEXT_TERTIARY = "#737373";
const ICON_COLOR = "#737373";

function generateStatsCard(stats) {
  const items = [
    { icon: starIcon, label: "Stars", value: formatNumber(stats.stars) },
    { icon: commitIcon, label: "Commits", value: formatNumber(stats.commits) },
    { icon: prIcon, label: "PRs", value: formatNumber(stats.prs) },
  ];

  const padding = 20;
  const headerHeight = 32;
  const rowHeight = 36;
  const cardWidth = 320;
  const cardHeight = padding + headerHeight + items.length * rowHeight + padding;

  const rows = items
    .map(
      (item, i) => `
    <g transform="translate(${padding}, ${padding + headerHeight + i * rowHeight})">
      <g transform="translate(0, 0)">${item.icon}</g>
      <text x="28" y="13" class="stat-label">${item.label}</text>
      <text x="${cardWidth - padding * 2}" y="13" class="stat-value" text-anchor="end">${item.value}</text>
    </g>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">
  <style>
    .card-title { font: 700 15px ${FONT}; fill: ${TEXT_PRIMARY}; }
    .stat-label { font: 500 13px ${FONT}; fill: ${TEXT_SECONDARY}; }
    .stat-value { font: 700 13px ${FONT}; fill: ${TEXT_PRIMARY}; }
    .icon { fill: ${ICON_COLOR}; }
  </style>
  <rect x="0.5" y="0.5" rx="${BORDER_RADIUS}" width="${cardWidth - 1}" height="${cardHeight - 1}" fill="${CARD_BG}" stroke="${CARD_BORDER}"/>
  <text x="${padding}" y="${padding + 14}" class="card-title">GitHub Stats</text>
  ${rows}
</svg>`;
}

function generateLanguagesCard(languages) {
  const padding = 20;
  const headerHeight = 32;
  const barHeight = 8;
  const barGap = 20;
  const langRowHeight = 28;
  const cardWidth = 320;
  const barWidth = cardWidth - padding * 2;
  const cardHeight = padding + headerHeight + barHeight + barGap + languages.length * langRowHeight + padding;

  const barSegments = languages
    .reduce(
      (acc, lang) => {
        const width = (parseFloat(lang.percentage) / 100) * barWidth;
        acc.segments.push(
          `<rect x="${acc.x}" y="${padding + headerHeight}" width="${width}" height="${barHeight}" fill="${lang.color}"/>`
        );
        acc.x += width;
        return acc;
      },
      { segments: [], x: padding }
    )
    .segments.join("");

  const barMask = `<rect x="${padding}" y="${padding + headerHeight}" width="${barWidth}" height="${barHeight}" rx="4" fill="white"/>`;

  const legendY = padding + headerHeight + barHeight + barGap;
  const legend = languages
    .map(
      (lang, i) => `
    <g transform="translate(${padding}, ${legendY + i * langRowHeight})">
      <circle cx="6" cy="7" r="5" fill="${lang.color}"/>
      <text x="18" y="11" class="lang-name">${lang.name}</text>
      <text x="${cardWidth - padding * 2}" y="11" class="lang-pct" text-anchor="end">${lang.percentage}%</text>
    </g>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cardWidth}" height="${cardHeight}" viewBox="0 0 ${cardWidth} ${cardHeight}">
  <style>
    .card-title { font: 700 15px ${FONT}; fill: ${TEXT_PRIMARY}; }
    .lang-name { font: 500 13px ${FONT}; fill: ${TEXT_SECONDARY}; }
    .lang-pct { font: 700 13px ${FONT}; fill: ${TEXT_PRIMARY}; }
  </style>
  <rect x="0.5" y="0.5" rx="${BORDER_RADIUS}" width="${cardWidth - 1}" height="${cardHeight - 1}" fill="${CARD_BG}" stroke="${CARD_BORDER}"/>
  <text x="${padding}" y="${padding + 14}" class="card-title">Top Languages</text>
  <defs>
    <clipPath id="bar-clip">${barMask}</clipPath>
  </defs>
  <g clip-path="url(#bar-clip)">${barSegments}</g>
  ${legend}
</svg>`;
}

// --- Helpers ---

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return String(num);
}

const starIcon = `<svg class="icon" viewBox="0 0 16 16" width="16" height="16"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>`;

const commitIcon = `<svg class="icon" viewBox="0 0 16 16" width="16" height="16"><path d="M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"/></svg>`;

const prIcon = `<svg class="icon" viewBox="0 0 16 16" width="16" height="16"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"/></svg>`;

// Common language colors (GitHub's linguist colors)
const LANG_COLORS = {
  Dart: "#00B4AB",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Python: "#3572A5",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Shell: "#89e051",
  Vue: "#41b883",
  SCSS: "#c6538c",
  Makefile: "#427819",
  CMake: "#DA3434",
  "Objective-C": "#438eff",
};
