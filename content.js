console.log("Notion Time Tracker content script loaded");

function parseTime(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)(AM|PM)/);
  if (!match) return null;
  const [_, hours, minutes, meridiem] = match;
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

function displayDuration(minutes, event) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const durationText = `🕒 ${hrs}h ${mins}m`;

  // Remove any existing popup
  const existing = document.querySelector(".duration-popout");
  if (existing) existing.remove();

  const popout = document.createElement("div");
  popout.innerText = durationText;
  popout.className = "duration-popout";
  popout.style.cssText = `
    position: fixed;
    top: ${event.clientY + 10}px;
    left: ${event.clientX + 10}px;
    background: #222;
    color: #fff;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    pointer-events: none;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
    opacity: 1;
    transition: opacity 0.2s ease-in-out;
  `;

  document.body.appendChild(popout);

  // Fade out after 3 seconds
  setTimeout(() => {
    popout.style.opacity = "0";
    setTimeout(() => popout.remove(), 300);
  }, 3000);
}

function extractAndCalculateFromElement(el, event) {
  const txt = el.innerText;
  console.log("Clicked block text:", txt);

  if (!txt.includes("→")) return;

  const [start, end] = txt.split("→").map(t => t.trim());
  const duration = calculateDuration(start, end);

  if (duration !== null) {
    displayDuration(duration, event);
  } else {
    console.log("Failed to parse duration");
  }
}

document.addEventListener("click", function (e) {
  const block = e.target.closest("[style*='background-color'], [class*='calendar']");
  if (block) {
    extractAndCalculateFromElement(block, e);
  }
});
