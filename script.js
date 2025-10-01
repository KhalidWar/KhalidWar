// Constants
const MAX_TAGLINE_LENGTH = 30;

// Function to fetch app data from App Store API
async function fetchAppData(appId) {
  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${appId}`,
      {
        method: "GET",
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      }
    );

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
  // Find all app cards with data-app-id
  const appCards = document.querySelectorAll(".portfolio-item[data-app-id]");

  try {
    // Fetch and update each app card
    for (const card of appCards) {
      const appId = card.getAttribute("data-app-id");
      if (appId) {
        const appStoreData = await fetchAppData(appId);
        if (appStoreData) {
          updateAppCard(card, appStoreData);
        }
      }
    }
  } catch (error) {
    console.error("Error loading apps:", error);
  }
}

// Function to load NCL logo
async function loadNCLLogo() {
  try {
    const nclData = await fetchAppData("6510931792"); // NCL App Store ID
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
  } catch (error) {
    console.error("Error loading NCL logo:", error);
  }
}

// Initialize theme based on user preference or system setting
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme) {
    // Use saved manual preference
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
  localStorage.setItem("theme", newTheme);

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

// Load apps and NCL logo when page loads
document.addEventListener("DOMContentLoaded", function () {
  loadApps();
  loadNCLLogo();

  // Initialize theme
  initializeTheme();

  // Listen for system theme changes
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function (e) {
      // Only auto-update if no manual preference is stored
      if (!localStorage.getItem("theme")) {
        const systemTheme = e.matches ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", systemTheme);
        updateThemeIcon(systemTheme);
      }
    });
});
