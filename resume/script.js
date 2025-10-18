// Centralized DOM Selectors
const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelector(selector);
const $$$ = (selector) => document.querySelectorAll(selector);

// Lazy load html2pdf library
let html2pdfLoaded = false;
async function loadHtml2Pdf() {
  if (html2pdfLoaded) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = () => {
      html2pdfLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Fixed Letter pixel dimensions at 96 DPI
const LETTER_PX_WIDTH = 816; // 8.5in × 96
const LETTER_PX_HEIGHT = 1056; // 11in × 96

// Ensure html2canvas and jsPDF are available (independent of html2pdf bundle)
async function ensurePdfDeps() {
  const loaders = [];

  if (!window.html2canvas) {
    loaders.push(
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      })
    );
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    loaders.push(
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      })
    );
  }

  if (loaders.length > 0) {
    await Promise.all(loaders);
  }
}

// Theme Management
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  html.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);

  const moonIcon = document.querySelector(".moon-icon");
  const sunIcon = document.querySelector(".sun-icon");

  if (newTheme === "dark") {
    moonIcon.style.display = "none";
    sunIcon.style.display = "block";
  } else {
    moonIcon.style.display = "block";
    sunIcon.style.display = "none";
  }
}

function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  const moonIcon = document.querySelector(".moon-icon");
  const sunIcon = document.querySelector(".sun-icon");

  if (savedTheme === "dark") {
    moonIcon.style.display = "none";
    sunIcon.style.display = "block";
  } else {
    moonIcon.style.display = "block";
    sunIcon.style.display = "none";
  }
}

// Page Format - Letter standard (enforced)
// No format toggling - Letter format only

// Resume API Configuration
const API_URL = "https://resume-api.khalidwar.workers.dev/resume";
const UPDATE_TOKEN = "super-secure-token";

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Last saved indicator
let lastSavedTime = null;
function updateLastSaved() {
  lastSavedTime = new Date();
  const indicator = $$(".sidebar-subtitle");
  if (indicator) {
    indicator.textContent = `Last saved: ${lastSavedTime.toLocaleTimeString()}`;
  }
}

let resumeData = {
  name: "Khalid Warsame",
  contact:
    "Nashville, TN (US Citizen) | (000) 000-0000 | abc@khalidwar.com | linkedin.com/in/abc",
  summary:
    "<strong>Results-driven mobile app developer with 4+ years of experience</strong> building <strong>high-quality apps using Flutter</strong>. Developed cross-platform apps that enhanced the guest experience for <strong>millions of users</strong> across 20 cruise ships, contributed to <strong>$10M+ in revenue</strong>, and helped a startup secure <strong>$100K in funding</strong> with a successful MVP launch.",
  experience:
    '<div class="experience-item"><div class="job-header"><span class="job-title"><strong>ABC Cruise Line - Full Time</strong></span><span class="job-location">Miami, Florida</span></div><div class="job-subtitle"><span class="job-role"><strong>MOBILE APP DEVELOPER</strong></span><span class="job-dates">Aug 2022 - Present</span></div><ul class="job-bullets"><li>Designed and launched <strong>cross-platform Android and iOS apps</strong>, enhancing the guest experience for <strong>millions of users</strong> across 20 cruise ships and boosting mobile engagement.</li><li>Engineered custom solutions for seamless app connectivity, achieving <strong>90% uptime</strong> across onshore cloud and onboard ship servers, ensuring uninterrupted user access.</li><li>Modularized <strong>80% of UI components</strong> and business logic, accelerating development timelines and reducing redundant code by 50%.</li><li>Contributed to <strong>$10M+ in revenue</strong> through the app launch, exceeding sales targets and driving onboard and onshore purchases.</li></ul></div><div class="experience-item"><div class="job-header"><span class="job-title"><strong>Huntington National Bank - Contract</strong></span><span class="job-location">Columbus, Ohio</span></div><div class="job-subtitle"><span class="job-role"><strong>MOBILE APP DEVELOPER</strong></span><span class="job-dates">Mar 2022 - Jul 2022</span></div><ul class="job-bullets"><li>Developed a <strong>secure, reliable banking app</strong> for Android and iOS, adhering to best practices like the CLEAN framework and achieving <strong>100% test coverage</strong>.</li><li>Implemented resilient, <strong>secure code</strong> to comply with strict banking regulations, ensuring <strong>zero data breaches</strong> and safeguarding sensitive user information.</li><li>Collaborated with cross-functional teams to enhance and maintain a consumer-facing app, resolving critical bugs and delivering new features to <strong>millions of users</strong>.</li></ul></div><div class="experience-item"><div class="job-header"><span class="job-title"><strong>Freelance & Consultancy</strong></span><span class="job-location">Remote</span></div><div class="job-subtitle"><span class="job-role"><strong>MOBILE APP DEVELOPER</strong></span><span class="job-dates">Oct 2020 - Present</span></div><ul class="job-bullets"><li>Developed an MVP for a real estate startup, enabling them to secure <strong>$100,000 in funding</strong> and achieve <strong>2,000+ downloads</strong> within 3 months of launch.</li><li>Built and published personal mobile apps, generating <strong>$3,000+ in passive revenue</strong> and demonstrating expertise in app monetization strategies.</li><li>Managed end-to-end development of multiple mobile apps across industries, delivering high-quality solutions with a <strong>98% crash-free rate</strong> and meeting tight deadlines.</li></ul></div>',
  skills:
    "<p><strong>Frontend:</strong> Flutter SDK, Dart, UI/UX Design.</p><p><strong>Backend:</strong> Firebase, Supabase (PostgreSQL), REST APIs</p><p><strong>DevOps:</strong> GitHub, Git, CI/CD Pipelines, GitHub Actions.</p><p><strong>Soft:</strong> Project planning, MVP building, cross-functional collaboration.</p><p><strong>Languages:</strong> English, Arabic, Somali.</p>",
  education:
    '<div class="education-item"><div class="education-header"><span class="school-name"><strong>South Central College</strong></span><span class="school-location">North Mankato, MN</span></div><p class="education-degree"><em>Information Technology (Incomplete)</em></p></div>',
};

async function loadResume() {
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const data = await res.json();
      if (Object.keys(data).length > 0) {
        resumeData = data;
      }
    }
  } catch (err) {
    console.warn("Could not load from API, using default resume:", err);
  }
  applyResumeToDOM();
  attachEditListeners();
}

function applyResumeToDOM() {
  const fieldsToUpdate = [
    "name",
    "contact",
    "summary",
    "experience",
    "skills",
    "education",
  ];

  fieldsToUpdate.forEach((field) => {
    const element = document.getElementById(field);
    if (!element) return;

    if (resumeData[field]) {
      element.innerHTML = resumeData[field];
    }
  });
}

function collectResumeFromDOM() {
  const fieldsToCollect = [
    "name",
    "contact",
    "summary",
    "experience",
    "skills",
    "education",
  ];
  const collected = {};

  fieldsToCollect.forEach((field) => {
    const element = document.getElementById(field);
    if (!element) return;
    collected[field] = element.innerHTML.trim();
  });

  return collected;
}

function attachEditListeners() {
  const editableFields = $$$(".editable-field");

  editableFields.forEach((field) => {
    field.addEventListener("input", () => {
      resumeData = collectResumeFromDOM();
      autoSave(); // Trigger auto-save on edit
    });

    field.addEventListener("paste", (event) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    });
  });
}

async function saveResume(retries = 3) {
  resumeData = collectResumeFromDOM();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${UPDATE_TOKEN}`,
        },
        body: JSON.stringify(resumeData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      updateLastSaved();
      alert("✅ Saved to Cloudflare KV");
      return;
    } catch (err) {
      console.error(`Save attempt ${attempt} failed:`, err);

      if (attempt === retries) {
        alert("❌ Failed to save after multiple attempts. Please try again.");
        return;
      }

      // Exponential backoff: wait 1s, 2s, 4s between retries
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      );
    }
  }
}

// Auto-save function (debounced)
const autoSave = debounce(async () => {
  resumeData = collectResumeFromDOM();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${UPDATE_TOKEN}`,
      },
      body: JSON.stringify(resumeData),
    });

    if (response.ok) {
      updateLastSaved();
    }
  } catch (err) {
    console.error("Auto-save failed:", err);
  }
}, 3000);

async function downloadPDF() {
  const resumeElement = $("resume");
  const sidebar = $$(".resume-sidebar");
  const html = document.documentElement;
  const currentTheme = html.getAttribute("data-theme");

  try {
    // Ensure required PDF deps are available
    await ensurePdfDeps();

    // Force light theme for PDF export
    if (currentTheme === "dark") {
      html.setAttribute("data-theme", "light");
    }

    // Hide sidebar during export
    if (sidebar) {
      sidebar.style.display = "none";
    }

    // Force scale(1) to prevent coordinate system misalignment
    const originalTransform = resumeElement.style.transform;
    const originalTransformOrigin = resumeElement.style.transformOrigin;
    const originalScaleProp = resumeElement.style.scale;
    const originalZoom = document.body.style.zoom;

    resumeElement.style.transform = "scale(1)";
    resumeElement.style.transformOrigin = "top left";
    // Also reset CSS 'scale' property in case it's used (modern property separate from transform)
    resumeElement.style.scale = "1";
    // Ensure no page-level zoom interferes with capture
    document.body.style.zoom = "1";

    // Wait for web fonts to finish loading to avoid reflow during capture
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (_) {}
    }

    // Apply export-only cleanup styles (no shadow/radius/margins)
    resumeElement.classList.add("export-mode");

    // Manual pipeline: html2canvas → jsPDF (avoid html2pdf auto-margins)
    const scale = 3; // Increased for sharper print rendering
    const canvas = await window.html2canvas(resumeElement, {
      scale: scale,
      useCORS: true,
      scrollX: 0,
      scrollY: 0,
      width: LETTER_PX_WIDTH,
      height: LETTER_PX_HEIGHT,
      backgroundColor: "#ffffff",
      removeContainer: true,
    });

    console.log(
      `🖼️ html2canvas size: ${canvas.width}×${canvas.height} (px) at scale ${scale}`
    );

    // Prefer PNG for sharper text and to avoid JPEG artifacts
    const imgData = canvas.toDataURL("image/png");
    const JsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!JsPDFCtor) {
      throw new Error("jsPDF not available on window");
    }

    const pdf = new JsPDFCtor({
      unit: "pt",
      format: [612, 792],
      orientation: "portrait",
      compress: true,
    });

    // Compute precise point dimensions from canvas to preserve proportions
    const PX_TO_PT = 72 / 96; // CSS px → PDF pt
    const contentWidthPt = (canvas.width / scale) * PX_TO_PT;
    const contentHeightPt = (canvas.height / scale) * PX_TO_PT;

    // Scale uniformly to fit Letter (612×792 pt), then center
    const PAGE_W_PT = 612;
    const PAGE_H_PT = 792;
    const scaleX = PAGE_W_PT / contentWidthPt;
    const scaleY = PAGE_H_PT / contentHeightPt;
    const uniform = Math.min(scaleX, scaleY);
    const drawW = contentWidthPt * uniform;
    const drawH = contentHeightPt * uniform;
    const offsetX = (PAGE_W_PT - drawW) / 2;
    const offsetY = (PAGE_H_PT - drawH) / 2;

    pdf.addImage(
      imgData,
      "PNG",
      offsetX,
      offsetY,
      drawW,
      drawH,
      undefined,
      "FAST"
    );
    pdf.setProperties({
      title: "Khalid Warsame Resume",
      subject: "Professional Resume",
      author: "Khalid Warsame",
      keywords: "resume, mobile developer, flutter",
      creator: "Resume Builder - khalidwar.com",
    });
    pdf.save("Khalid_Warsame_Resume.pdf");

    // Restore original transform
    resumeElement.style.transform = originalTransform;
    resumeElement.style.transformOrigin = originalTransformOrigin;
    resumeElement.style.scale = originalScaleProp;
    resumeElement.classList.remove("export-mode");
    document.body.style.zoom = originalZoom;

    // Restore sidebar and theme after export
    if (sidebar) {
      sidebar.style.display = "";
    }
    if (currentTheme === "dark") {
      html.setAttribute("data-theme", currentTheme);
    }

    console.log("✅ PDF exported successfully");
    console.log("📄 Format: Letter (612 × 792 points = 8.5 × 11 inches)");
    console.log("🎯 Page size verified: use Preview Inspector to confirm");
  } catch (error) {
    console.error("PDF generation failed:", error);
    alert("❌ Failed to generate PDF. Please try again.");

    // Restore UI on error
    resumeElement.style.transform = originalTransform;
    resumeElement.style.transformOrigin = originalTransformOrigin;
    resumeElement.style.scale = originalScaleProp;
    resumeElement.classList.remove("export-mode");
    document.body.style.zoom = originalZoom;

    if (sidebar) {
      sidebar.style.display = "";
    }
    if (currentTheme === "dark") {
      html.setAttribute("data-theme", currentTheme);
    }
  }
}

// Text Formatting Functions
function formatText(command) {
  document.execCommand(command, false, null);
  updateFormattingButtons();
}

// Update formatting button states based on current selection
function updateFormattingButtons() {
  const boldBtn = document.getElementById("bold-btn");
  const italicBtn = document.getElementById("italic-btn");
  const underlineBtn = document.getElementById("underline-btn");

  // Check which formatting is active at cursor/selection
  const isBold = document.queryCommandState("bold");
  const isItalic = document.queryCommandState("italic");
  const isUnderline = document.queryCommandState("underline");

  // Add/remove active class for text style only (not alignment or lists)
  if (isBold) {
    boldBtn.classList.add("active");
  } else {
    boldBtn.classList.remove("active");
  }

  if (isItalic) {
    italicBtn.classList.add("active");
  } else {
    italicBtn.classList.remove("active");
  }

  if (isUnderline) {
    underlineBtn.classList.add("active");
  } else {
    underlineBtn.classList.remove("active");
  }

  // Note: Alignment, bullet list, numbered list, and clear format buttons
  // are not highlighted as they change UI layout and can be distracting
}

// Keyboard shortcuts for formatting
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case "b":
        e.preventDefault();
        formatText("bold");
        break;
      case "i":
        e.preventDefault();
        formatText("italic");
        break;
      case "u":
        e.preventDefault();
        formatText("underline");
        break;
    }
  }
});

// Debug: Toggle dimension guides (for development)
let guidesEnabled = false;
function toggleDimensionGuides() {
  const doc = $("resume");
  guidesEnabled = !guidesEnabled;

  if (guidesEnabled) {
    // Add outline and grid overlay
    doc.style.outline = "2px dashed red";
    doc.classList.add("show-grid");

    console.log("✅ Dimension guides enabled");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📐 Expected dimensions:");
    console.log("   • Outer: 816px × 1056px (8.5in × 11in @ 96 DPI)");
    console.log("   • Content: 624px × 864px (6.5in × 9in with 1in padding)");
    console.log("   • PDF: 612pt × 792pt (Letter standard)");
    console.log("");

    // Log actual dimensions
    const computed = window.getComputedStyle(doc);
    const actualWidth = doc.offsetWidth;
    const actualHeight = doc.offsetHeight;
    const widthMatch = actualWidth === 816 ? "✅" : "❌";
    const heightMatch = actualHeight === 1056 ? "✅" : "❌";

    console.log("📊 Actual dimensions:");
    console.log(
      `   • Width: ${computed.width} (${actualWidth}px) ${widthMatch}`
    );
    console.log(
      `   • Height: ${computed.height} (${actualHeight}px) ${heightMatch}`
    );
    console.log("");

    if (actualWidth === 816 && actualHeight === 1056) {
      console.log("🎯 Perfect! Dimensions match Letter standard exactly.");
    } else {
      console.warn("⚠️  Dimensions don't match. Check CSS and scaling.");
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("💡 Red grid overlay: each cell = 1 inch × 1 inch");
    console.log("   Expected grid: 8.5 cells wide × 11 cells tall");
  } else {
    doc.style.outline = "";
    doc.classList.remove("show-grid");
    console.log("❌ Dimension guides disabled");
  }
}

// Expose to window for console access
window.toggleDimensionGuides = toggleDimensionGuides;

// Screen Size Guardrails
// Minimum laptop screen width
const MIN_SCREEN_WIDTH = 1024;

function updateScreenWarning() {
  const currentWidth = window.innerWidth;
  const warningElement = document.getElementById("small-screen-warning");
  const widthDisplay = document.getElementById("current-width");

  if (widthDisplay) {
    widthDisplay.textContent = `Current width: ${currentWidth}px`;
  }
}

function checkScreenSize() {
  const currentWidth = window.innerWidth;
  updateScreenWarning();
}

// Check on load
window.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  loadResume();
  checkScreenSize();

  document.getElementById("save").addEventListener("click", saveResume);
  document.getElementById("download").addEventListener("click", downloadPDF);
});

// Check on resize
window.addEventListener("resize", () => {
  updateScreenWarning();
});

// Update formatting buttons when selection changes
document.addEventListener("selectionchange", () => {
  // Only update if selection is within resume document
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const resumeDoc = document.getElementById("resume");
    if (resumeDoc && resumeDoc.contains(range.commonAncestorContainer)) {
      updateFormattingButtons();
    }
  }
});

// Update formatting buttons when clicking in editable fields
document.addEventListener("click", (e) => {
  if (e.target.closest(".editable-field")) {
    updateFormattingButtons();
  }
});
