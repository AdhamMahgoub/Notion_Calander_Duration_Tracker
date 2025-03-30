// content.js
console.log("Notion Time Tracker content script loaded");

let lastMouse = { x: 100, y: 100 };
let isDragging = false;

function parseTime(timeStr) {
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?(AM|PM)/);
  if (!match) return null;
  const [, hours, minutes = "00", meridiem] = match;
  let h = parseInt(hours);
  const m = parseInt(minutes);
  if (meridiem === "PM" && h !== 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function calculateDuration(startStr, endStr) {
  const startTime = parseTime(startStr);
  const endTime = parseTime(endStr);
  if (startTime === null || endTime === null) return null;

  return endTime >= startTime
    ? endTime - startTime
    : (24 * 60 - startTime) + endTime;
}

function showHoverDuration(text) {
  let hoverBox = document.querySelector(".duration-hover-box");
  if (!hoverBox) {
    hoverBox = document.createElement("div");
    hoverBox.className = "duration-hover-box";
    document.body.appendChild(hoverBox);
    hoverBox.style.cssText = `
      position: fixed;
      background: #111;
      color: #fff;
      padding: 6px 10px;
      font-size: 13px;
      border-radius: 6px;
      pointer-events: none;
      z-index: 10000;
    `;
  }
  hoverBox.textContent = text;
  hoverBox.style.top = `${lastMouse.y + 12}px`;
  hoverBox.style.left = `${lastMouse.x + 12}px`;
}

document.addEventListener("mousemove", (e) => {
  lastMouse = { x: e.clientX, y: e.clientY };
  const hoverBox = document.querySelector(".duration-hover-box");
  if (hoverBox) {
    hoverBox.style.top = `${e.clientY + 12}px`;
    hoverBox.style.left = `${e.clientX + 12}px`;
  }
  if (isDragging) {
    extractTimeFromSidebar();
  }
});

document.addEventListener("mousedown", () => {
  isDragging = true;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

function hideHoverDuration() {
  const hoverBox = document.querySelector(".duration-hover-box");
  if (hoverBox) hoverBox.remove();
}

function showSidebarDuration(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const durationText = `🕒 ${hrs}h ${mins}m`;

  console.log("📊 Showing Sidebar Duration:", durationText);
  showHoverDuration(durationText);

  let existing = document.querySelector(".duration-sidebar-label");
  if (!existing) {
    existing = document.createElement("div");
    existing.className = "duration-sidebar-label";
    const target = document.querySelector('[data-root-scroll-context]');
    if (!target) return;
    existing.style.cssText = `
      margin-top: 10px;
      font-size: 14px;
      font-weight: bold;
      color: #0f0;
    `;
    target.appendChild(existing);
  }
  existing.textContent = durationText;
}

let lastTimeKey = "";

function extractTimeFromSidebar(event) {
  const inputTimes = Array.from(document.querySelectorAll('input[type="text"][data-subdued="true"]'))
    .map(el => el.value?.trim())
    .filter(txt => /^\d{1,2}(:\d{2})?(AM|PM)$/.test(txt));

  const divTimes = Array.from(document.querySelectorAll('div[aria-hidden="true"]'))
    .map(el => el.textContent.trim())
    .filter(txt => /^\d{1,2}(:\d{2})?(AM|PM)$/.test(txt));

  const allTimes = [...new Set([...inputTimes, ...divTimes])];

  if (allTimes.length < 2) {
    console.log("❌ Not enough time entries found:", allTimes);
    hideHoverDuration();
    return;
  }

  const timeKey = allTimes.join(" → ");
  if (timeKey === lastTimeKey && !event) return;
  lastTimeKey = timeKey;

  if (event) {
    console.log("🔍 Time elements found (on click):", allTimes);
  } else {
    console.log("🔁 Time elements found (auto-detected):", allTimes);
  }

  const [start, end] = allTimes;
  console.log(`⏱ Found time range: ${start} → ${end}`);

  const duration = calculateDuration(start, end);

  if (duration !== null) {
    console.log(`🕒 Duration: ${Math.floor(duration / 60)}h ${duration % 60}m`);
    showSidebarDuration(duration);
  } else {
    console.log("❌ Failed to calculate duration from sidebar times");
    hideHoverDuration();
  }
}

// Always check on click
document.addEventListener("click", function (e) {
  const block = e.target.closest("[style*='background-color'], [class*='calendar']");
  if (block) {
    setTimeout(() => extractTimeFromSidebar(e), 1500);
  }
});

// Trigger on sidebar change (for drag or live edits)
const observer = new MutationObserver(() => {
  extractTimeFromSidebar();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});