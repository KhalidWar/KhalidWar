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
    const response = await fetch("/api/stats");
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
