import { loadAppData } from "./data.js";
import { buildSections, scoreSection, scoreSections, normalizeDegrees } from "./shade.js";
import { getSunPosition } from "./solar.js";

const CENTER = { x: 460, y: 380 };
const DEG = Math.PI / 180;
const STATUS = {
  shade: { label: "Shade", color: "#3f6f88" },
  mixed: { label: "Mixed", color: "#d5a346" },
  sun: { label: "Sun", color: "#d8693d" },
};

const state = {
  compassZones: [],
  levels: [],
  venues: [],
  venue: null,
  selectedSectionId: null,
  playing: false,
  timer: null,
};

const els = {
  venueSelect: document.getElementById("venueSelect"),
  eventDate: document.getElementById("eventDate"),
  startTime: document.getElementById("startTime"),
  durationSelect: document.getElementById("durationSelect"),
  timeSlider: document.getElementById("timeSlider"),
  timeLabel: document.getElementById("timeLabel"),
  playButton: document.getElementById("playButton"),
  bowlLayer: document.getElementById("bowlLayer"),
  sectionLayer: document.getElementById("sectionLayer"),
  fieldLayer: document.getElementById("fieldLayer"),
  sunLayer: document.getElementById("sunLayer"),
  sunStatus: document.getElementById("sunStatus"),
  sunMeta: document.getElementById("sunMeta"),
  sectionName: document.getElementById("sectionName"),
  sectionMeta: document.getElementById("sectionMeta"),
  bestCount: document.getElementById("bestCount"),
  bestList: document.getElementById("bestList"),
  timelineRange: document.getElementById("timelineRange"),
  timelineBars: document.getElementById("timelineBars"),
};

async function init() {
  const data = await loadAppData();
  state.compassZones = data.compassZones;
  state.levels = data.levels;
  state.venues = data.venues;
  state.venue = state.venues[0];

  state.venues.forEach((venue) => {
    const option = document.createElement("option");
    option.value = venue.id;
    option.textContent = `${venue.name} (${venue.sport})`;
    els.venueSelect.appendChild(option);
  });

  els.eventDate.value = new Date().toISOString().slice(0, 10);
  els.startTime.value = state.venue.defaultStartTime;
  els.timeSlider.max = els.durationSelect.value;

  els.venueSelect.addEventListener("change", () => {
    state.venue = state.venues.find((venue) => venue.id === els.venueSelect.value) || state.venues[0];
    state.selectedSectionId = null;
    els.startTime.value = state.venue.defaultStartTime;
    render();
  });

  els.eventDate.addEventListener("change", render);
  els.startTime.addEventListener("change", render);
  els.timeSlider.addEventListener("input", render);
  els.durationSelect.addEventListener("change", () => {
    els.timeSlider.max = els.durationSelect.value;
    els.timeSlider.value = Math.min(Number(els.timeSlider.value), Number(els.timeSlider.max));
    render();
  });
  els.playButton.addEventListener("click", togglePlayback);

  render();
}

function render() {
  const sections = buildSections(state.venue, state.levels, state.compassZones);
  const time = getEventTime(Number(els.timeSlider.value));
  const sun = getSunPosition(time, state.venue.latitude, state.venue.longitude);
  const scoredSections = scoreSections(sections, sun, state.venue);

  if (!state.selectedSectionId || !scoredSections.some((section) => section.id === state.selectedSectionId)) {
    state.selectedSectionId = scoredSections[0].id;
  }

  renderStadium(scoredSections, sun);
  renderDetails(scoredSections, sun, time);
}

function renderStadium(sections, sun) {
  els.bowlLayer.replaceChildren();
  els.sectionLayer.replaceChildren();
  els.fieldLayer.replaceChildren();
  els.sunLayer.replaceChildren();

  els.bowlLayer.appendChild(
    svgEl("ellipse", {
      cx: CENTER.x,
      cy: CENTER.y + 14,
      rx: 376,
      ry: 302,
      fill: "rgba(53, 48, 38, 0.09)",
    }),
  );

  sections.forEach((section) => {
    const path = svgEl("path", {
      d: annularSectorPath(
        section.innerRadius,
        section.outerRadius,
        section.startAngle + state.venue.rotation,
        section.endAngle + state.venue.rotation,
      ),
      fill: STATUS[section.status].color,
      opacity: String(0.72 + section.shadeScore * 0.24),
      class: `section-path${section.id === state.selectedSectionId ? " selected" : ""}`,
      tabindex: "0",
      role: "button",
      "aria-label": `${section.name}, ${STATUS[section.status].label}`,
    });

    path.addEventListener("click", () => {
      state.selectedSectionId = section.id;
      render();
    });
    path.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        state.selectedSectionId = section.id;
        render();
      }
    });
    els.sectionLayer.appendChild(path);

    const labelPoint = polarToSvg((section.innerRadius + section.outerRadius) / 2, section.centerAngle + state.venue.rotation);
    const label = svgEl("text", {
      x: labelPoint.x,
      y: labelPoint.y + 4,
      class: "section-label",
    });
    label.textContent = section.name
      .split(" ")
      .map((part) => part[0])
      .join("");
    els.sectionLayer.appendChild(label);
  });

  renderField();
  renderSun(sun);
}

function renderField() {
  const group = svgEl("g", {
    transform: `rotate(${state.venue.rotation} ${CENTER.x} ${CENTER.y})`,
  });

  if (state.venue.fieldType === "baseball") {
    group.appendChild(
      svgEl("path", {
        d: `M ${CENTER.x} ${CENTER.y + 96} L ${CENTER.x - 128} ${CENTER.y - 28} Q ${CENTER.x} ${CENTER.y - 158} ${CENTER.x + 128} ${CENTER.y - 28} Z`,
        fill: "#8b6c46",
      }),
    );
    group.appendChild(
      svgEl("path", {
        d: `M ${CENTER.x} ${CENTER.y + 86} L ${CENTER.x - 92} ${CENTER.y - 4} Q ${CENTER.x} ${CENTER.y - 98} ${CENTER.x + 92} ${CENTER.y - 4} Z`,
        fill: "var(--field)",
      }),
    );
    group.appendChild(
      svgEl("path", {
        d: `M ${CENTER.x} ${CENTER.y + 82} L ${CENTER.x - 84} ${CENTER.y} L ${CENTER.x} ${CENTER.y - 82} L ${CENTER.x + 84} ${CENTER.y} Z`,
        class: "field-line",
      }),
    );
    group.appendChild(svgEl("circle", { cx: CENTER.x, cy: CENTER.y, r: 10, fill: "#d9c495" }));
  } else {
    group.appendChild(
      svgEl("rect", {
        x: CENTER.x - 154,
        y: CENTER.y - 238,
        width: 308,
        height: 476,
        rx: 6,
        fill: "var(--field)",
      }),
    );
    group.appendChild(
      svgEl("rect", {
        x: CENTER.x - 136,
        y: CENTER.y - 220,
        width: 272,
        height: 440,
        class: "field-line",
      }),
    );
    group.appendChild(
      svgEl("line", {
        x1: CENTER.x - 136,
        y1: CENTER.y,
        x2: CENTER.x + 136,
        y2: CENTER.y,
        class: "field-line",
      }),
    );
    group.appendChild(svgEl("circle", { cx: CENTER.x, cy: CENTER.y, r: 46, class: "field-line" }));
  }

  els.fieldLayer.appendChild(group);
}

function renderSun(sun) {
  const sunPoint = polarToSvg(416, sun.azimuth);
  const rayEnd = polarToSvg(310, normalizeDegrees(sun.azimuth + 180));

  els.sunLayer.appendChild(
    svgEl("line", {
      x1: sunPoint.x,
      y1: sunPoint.y,
      x2: rayEnd.x,
      y2: rayEnd.y,
      stroke: "rgba(216, 105, 61, 0.42)",
      "stroke-width": 5,
      "stroke-linecap": "round",
      "stroke-dasharray": "12 12",
    }),
  );
  els.sunLayer.appendChild(
    svgEl("circle", {
      cx: sunPoint.x,
      cy: sunPoint.y,
      r: 24,
      fill: "#f2bc54",
      stroke: "#fff7dc",
      "stroke-width": 7,
    }),
  );

  const label = svgEl("text", {
    x: sunPoint.x,
    y: sunPoint.y + 48,
    fill: "#6b4d15",
    "font-size": 16,
    "font-weight": 850,
    "text-anchor": "middle",
  });
  label.textContent = "SUN";
  els.sunLayer.appendChild(label);
}

function renderDetails(sections, sun, time) {
  const selected = sections.find((section) => section.id === state.selectedSectionId) || sections[0];
  const shadedCount = sections.filter((section) => section.status === "shade").length;
  const shadedPercent = Math.round((shadedCount / sections.length) * 100);
  const offset = Number(els.timeSlider.value);

  els.timeLabel.textContent = `${formatClock(time)} (+${offset} min)`;
  els.sunStatus.textContent = sun.elevation <= 0 ? "Below horizon" : `${Math.round(sun.elevation)} degrees high`;
  els.sunMeta.textContent = `${Math.round(sun.azimuth)} degree azimuth. ${shadedPercent}% of sections are shaded now.`;

  els.sectionName.textContent = selected.name;
  els.sectionMeta.textContent = `${STATUS[selected.status].label}. ${Math.round(
    selected.shadeScore * 100,
  )}% shade confidence. ${selected.glare}.`;

  const best = [...sections].sort((a, b) => b.shadeScore - a.shadeScore).slice(0, 5);
  els.bestCount.textContent = `${best.length} sections`;
  els.bestList.replaceChildren(
    ...best.map((section) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "section-card";
      card.innerHTML = `
        <span>
          <strong>${section.name}</strong>
          <span>${section.glare}</span>
        </span>
        <b class="score-pill" style="background:${STATUS[section.status].color}">${Math.round(section.shadeScore * 100)}%</b>
      `;
      card.addEventListener("click", () => {
        state.selectedSectionId = section.id;
        render();
      });
      return card;
    }),
  );

  renderTimeline(selected);
}

function renderTimeline(section) {
  const duration = Number(els.durationSelect.value);
  const rows = [];

  for (let minute = 0; minute <= duration; minute += 30) {
    const sampleTime = getEventTime(minute);
    const sampleSun = getSunPosition(sampleTime, state.venue.latitude, state.venue.longitude);
    const matchingSection = buildSections(state.venue, state.levels, state.compassZones).find((candidate) => candidate.id === section.id);
    rows.push({
      minute,
      time: sampleTime,
      section: scoreSection(matchingSection, sampleSun, state.venue),
    });
  }

  els.timelineRange.textContent = `${formatClock(getEventTime(0))}-${formatClock(getEventTime(duration))}`;
  els.timelineBars.replaceChildren(
    ...rows.map((row) => {
      const item = document.createElement("div");
      item.className = "timeline-row";
      item.innerHTML = `
        <span>${formatClock(row.time)}</span>
        <span class="bar-track">
          <i class="bar-fill" style="width:${Math.max(8, row.section.shadeScore * 100)}%;background:${STATUS[row.section.status].color}"></i>
        </span>
        <span>${Math.round(row.section.shadeScore * 100)}%</span>
      `;
      item.addEventListener("click", () => {
        els.timeSlider.value = row.minute;
        render();
      });
      return item;
    }),
  );
}

function togglePlayback() {
  state.playing = !state.playing;
  els.playButton.textContent = state.playing ? "Pause" : "Play";

  if (!state.playing) {
    clearInterval(state.timer);
    return;
  }

  state.timer = setInterval(() => {
    const nextValue = Number(els.timeSlider.value) + 5;
    els.timeSlider.value = nextValue > Number(els.timeSlider.max) ? 0 : nextValue;
    render();
  }, 450);
}

function getEventTime(offsetMinutes) {
  const [year, month, day] = els.eventDate.value.split("-").map(Number);
  const [startHour, startMinute] = els.startTime.value.split(":").map(Number);
  const totalMinutes = startHour * 60 + startMinute + offsetMinutes;

  return {
    year,
    month,
    day,
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
  };
}

function annularSectorPath(innerRadius, outerRadius, startDegrees, endDegrees) {
  const startOuter = polarToSvg(outerRadius, startDegrees);
  const endOuter = polarToSvg(outerRadius, endDegrees);
  const startInner = polarToSvg(innerRadius, startDegrees);
  const endInner = polarToSvg(innerRadius, endDegrees);
  const largeArc = Math.abs(endDegrees - startDegrees) > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function polarToSvg(radius, degrees) {
  const radians = degrees * DEG;
  return {
    x: CENTER.x + Math.sin(radians) * radius,
    y: CENTER.y - Math.cos(radians) * radius,
  };
}

function svgEl(tagName, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function formatClock(time) {
  const hour = ((time.hour % 24) + 24) % 24;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(time.minute).padStart(2, "0")} ${suffix}`;
}

function showFatalError(error) {
  console.error(error);
  document.body.innerHTML = `
    <main style="max-width: 680px; margin: 64px auto; padding: 24px; font-family: system-ui, sans-serif; line-height: 1.5;">
      <h1>ShadeSeats could not load venue data</h1>
      <p>Run the app through a local server so the browser can fetch files from the <code>data/</code> folder.</p>
      <pre style="padding: 16px; overflow: auto; background: #f3efe7; border: 1px solid #d8d0c2;">${error.message}</pre>
    </main>
  `;
}

init().catch(showFatalError);
