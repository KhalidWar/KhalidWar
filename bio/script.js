// Constants
const MAX_TAGLINE_LENGTH = 30;

// Function to fetch app data from App Store API via Cloudflare Pages Function
async function fetchAppData(appId) {
  try {
    // Use our own Cloudflare Pages Function to avoid CORS issues
    const response = await fetch(`/apps-data?id=${appId}`, {
      method: "GET",
      cache: "default",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.resultCount > 0) {
      return data.results[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching app data for", appId, ":", error);
    return null;
  }
}

// Function to update an app card with API data
function updateAppCard(cardElement, appStoreData) {
  if (!cardElement || !appStoreData) return;

  // Update app icon - preserve emoji as fallback
  const iconContainer = cardElement.querySelector(".app-store-icon");
  if (
    iconContainer &&
    (appStoreData.artworkUrl512 || appStoreData.artworkUrl100)
  ) {
    const fallbackEmoji = iconContainer.textContent.trim();
    const img = document.createElement("img");
    img.src = appStoreData.artworkUrl512 || appStoreData.artworkUrl100;
    img.alt = `${appStoreData.trackName} icon`;
    img.onerror = function () {
      // Revert to emoji if image fails - restore background and emoji
      iconContainer.innerHTML = fallbackEmoji;
      iconContainer.style.backgroundColor = "";
    };
    img.onload = function () {
      // Remove background color when image loads successfully
      iconContainer.style.backgroundColor = "transparent";
    };
    // Replace the emoji text with the image (CSS will handle sizing via .app-store-icon img)
    iconContainer.innerHTML = "";
    iconContainer.appendChild(img);
  }

  // Update app name
  const nameElement = cardElement.querySelector(".app-info h4");
  if (nameElement && appStoreData.trackName) {
    nameElement.textContent = appStoreData.trackName;
  }

  // Update tagline
  const taglineElement = cardElement.querySelector(".app-tagline");
  if (taglineElement && appStoreData.description) {
    let tagline = appStoreData.description;
    if (tagline.length > MAX_TAGLINE_LENGTH) {
      tagline = tagline.substring(0, MAX_TAGLINE_LENGTH).trim() + "...";
    }
    taglineElement.textContent = tagline;
  }
}

// Function to load all apps
async function loadApps() {
  const appCards = document.querySelectorAll(".portfolio-item[data-app-id]");
  const appDataCache = {};

  try {
    for (const card of appCards) {
      const appId = card.getAttribute("data-app-id");
      if (appId) {
        const appStoreData = await fetchAppData(appId);
        if (appStoreData) {
          appDataCache[appId] = appStoreData;
          updateAppCard(card, appStoreData);
        }
      }
    }

    // Load NCL logo using cached data if available
    const nclAppId = "6510931792";
    if (appDataCache[nclAppId]) {
      updateNCLLogo(appDataCache[nclAppId]);
    }
  } catch (error) {
    console.error("Error loading apps:", error);
  }
}

// Function to update NCL logo with app data
function updateNCLLogo(nclData) {
  if (nclData && nclData.artworkUrl60) {
    const logoContainer = document.getElementById("ncl-logo-container");
    if (logoContainer) {
      logoContainer.innerHTML = `
                <img src="${nclData.artworkUrl60}" 
                     alt="NCL App Logo" 
                     class="ncl-logo"
                     onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'ncl-logo-placeholder\\'>🚢</div>';">
            `;
    }
  }
}

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

// Function to load YouTube video when clicked
function loadVideo() {
  const placeholder = document.querySelector(".video-placeholder");
  const iframe = document.getElementById("youtube-iframe");

  if (placeholder && iframe) {
    // Set the iframe source to load the video
    iframe.src =
      "https://www.youtube.com/embed/nhWBNjzv_6g?rel=0&modestbranding=1&showinfo=0&autoplay=1";

    // Hide placeholder and show iframe
    placeholder.style.display = "none";
    iframe.style.display = "block";
  }
}

// Load apps and NCL logo when page loads
document.addEventListener("DOMContentLoaded", function () {
  loadApps();

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
});
// Bio Page JavaScript

// Carousel navigation
function scrollCarousel(direction) {
  const carousel = document.getElementById("category-carousel");
  const scrollAmount = direction === "next" ? 280 : -280;
  carousel.scrollBy({ left: scrollAmount, behavior: "smooth" });
}

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
  try {
    const response = await fetch("/stats");
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
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
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

// Load stats when page is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadSocialStats);
} else {
  loadSocialStats();
}
