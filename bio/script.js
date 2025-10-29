// Initialize theme based on session preference or system setting
function initializeTheme() {
  const savedTheme = sessionStorage.getItem("theme");

  if (savedTheme) {
    // Use saved session preference
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
  } else {
    // Auto-detect system preference
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const systemTheme = prefersDark ? "dark" : "light";

    // Apply system theme
    document.documentElement.setAttribute("data-theme", systemTheme);
    updateThemeIcon(systemTheme);
  }
}

// Theme toggle function
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", newTheme);
  sessionStorage.setItem("theme", newTheme);

  // Update icon visibility
  updateThemeIcon(newTheme);
}

// Function to update theme icon
function updateThemeIcon(theme) {
  const moonIcon = document.querySelector(".moon-icon");
  const sunIcon = document.querySelector(".sun-icon");

  if (theme === "dark") {
    // Show sun icon when in dark mode
    moonIcon.style.display = "none";
    sunIcon.style.display = "block";
  } else {
    // Show moon icon when in light mode
    moonIcon.style.display = "block";
    sunIcon.style.display = "none";
  }
}

// Load theme and social stats when page loads
document.addEventListener("DOMContentLoaded", function () {
  // Initialize theme
  initializeTheme();

  // Listen for system theme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function (e) {
      // Only auto-update if no manual preference is stored for this session
      if (!sessionStorage.getItem("theme")) {
        const systemTheme = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", systemTheme);
        updateThemeIcon(systemTheme);
      }
    });

  // Load social stats
  loadSocialStats();
});

// YouTube video click-to-load
function loadVideo(videoId, element) {
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.style.cssText =
    "width:100%;height:100%;border:none;border-radius:var(--border-radius-md)";

  element.parentNode.replaceChild(iframe, element);
  iframe.setAttribute("tabindex", "0");
  iframe.focus();
}

// Load social stats progressively
async function loadSocialStats() {
  // Use dummy data if testing locally (file:// protocol)
  if (window.location.protocol === "file:") {
    console.info("Social stats: Using local dummy data");
    // Simulate network delay
    setTimeout(() => {
      const dummyData = {
        youtube: { subscribers: 1000 },
        instagram: { followers: 10000 },
        tiktok: { followers: 100000 },
        twitter: { followers: 1000000 },
      };
      updateSocialCounts(dummyData);
    }, 500); // 1 second delay to simulate API
    return;
  }

  try {
    const response = await fetch("/api/v1/social-media-stats");
    if (!response.ok) throw new Error("Failed to fetch stats");

    const data = await response.json();
    updateSocialCounts(data);
  } catch (error) {
    console.warn("Could not load social stats:", error);
    // Fail silently - page works fine without counts
  }
}

// Update UI with social counts
function updateSocialCounts(data) {
  // Format numbers with K/M suffix
  const formatCount = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 10000) return Math.floor(num / 1000) + "k"; // 10k+ as whole thousands
    if (num >= 1000) return (num / 1000).toFixed(1) + "k"; // under 10k keep one decimal
    return num.toString();
  };

  // Update each platform's count
  const platforms = {
    youtube: data.youtube?.subscribers,
    instagram: data.instagram?.followers,
    tiktok: data.tiktok?.followers,
    twitter: data.twitter?.followers,
  };

  Object.entries(platforms).forEach(([platform, count]) => {
    if (count) {
      const card = document.querySelector(
        `.social-stat-card[data-platform="${platform}"]`
      );
      if (card) {
        const countElement = card.querySelector(".social-stat-count");
        countElement.textContent = formatCount(count);
        // Trigger transition after browser has rendered
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            card.classList.add("has-count");
          });
        });
      }
    }
  });
}
