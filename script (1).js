// Weather Time Machine
// Data source: Open-Meteo (https://open-meteo.com) — free, no API key required.

const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const statusEl = document.getElementById("status");
const result = document.getElementById("result");

const WEATHER_CODES = {
  0: "clear sky", 1: "mostly clear", 2: "partly cloudy", 3: "overcast",
  45: "fog", 48: "depositing rime fog",
  51: "light drizzle", 53: "drizzle", 55: "dense drizzle",
  61: "light rain", 63: "rain", 65: "heavy rain",
  71: "light snow", 73: "snow", 75: "heavy snow",
  80: "rain showers", 81: "rain showers", 82: "violent rain showers",
  95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with heavy hail",
};

const YEARS_BACK = 6;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (!city) return;
  await run(city);
});

async function run(city) {
  setStatus(`Looking up "${city}"…`);
  result.classList.add("hidden");

  try {
    const place = await geocode(city);
    if (!place) {
      setStatus(`Couldn't find "${city}". Try a different spelling or a nearby larger city.`, true);
      return;
    }

    setStatus(`Fetching today's weather…`);
    const current = await fetchCurrent(place.latitude, place.longitude);

    setStatus(`Fetching ${YEARS_BACK} years of history for this date…`);
    const history = await fetchHistory(place.latitude, place.longitude);

    renderToday(place, current);
    renderHistory(history, current);

    setStatus("");
    result.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    setStatus(`Something went wrong: ${err.message}. Please try again.`, true);
  }
}

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", isError);
}

async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`geocoding request failed (${res.status})`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return {
    name: r.name,
    admin: r.admin1 || "",
    country: r.country || "",
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

async function fetchCurrent(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`forecast request failed (${res.status})`);
  const data = await res.json();
  const current = data.current;
  if (!current || typeof current.temperature_2m !== "number") {
    throw new Error("forecast API returned no current-weather data for this location");
  }
  return current;
}

async function fetchHistory(lat, lon) {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const years = [];
  for (let i = 1; i <= YEARS_BACK; i++) years.push(today.getFullYear() - i);

  const requests = years.map(async (year) => {
    const date = `${year}-${mm}-${dd}`;
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
      `&start_date=${date}&end_date=${date}&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const max = data?.daily?.temperature_2m_max?.[0];
      const min = data?.daily?.temperature_2m_min?.[0];
      if (typeof max !== "number" || typeof min !== "number") return null;
      return { year, max, min, avg: (max + min) / 2 };
    } catch {
      return null;
    }
  });

  const settled = await Promise.all(requests);
  return settled.filter(Boolean).sort((a, b) => a.year - b.year);
}

// --- Weather icons (simple, distinctive line-style SVGs) ---
function weatherIcon(code) {
  const c = code;
  const sunPath = `<circle cx="32" cy="32" r="13" fill="none" stroke="var(--amber-deep, #C97316)" stroke-width="3"/>
    <g stroke="var(--amber-deep, #C97316)" stroke-width="3" stroke-linecap="round">
      <line x1="32" y1="4" x2="32" y2="12"/><line x1="32" y1="52" x2="32" y2="60"/>
      <line x1="4" y1="32" x2="12" y2="32"/><line x1="52" y1="32" x2="60" y2="32"/>
      <line x1="12" y1="12" x2="17.5" y2="17.5"/><line x1="46.5" y1="46.5" x2="52" y2="52"/>
      <line x1="52" y1="12" x2="46.5" y2="17.5"/><line x1="17.5" y1="46.5" x2="12" y2="52"/>
    </g>`;
  const cloud = `<path d="M14 44a10 10 0 0 1 3-19.5 13 13 0 0 1 25-4A11 11 0 0 1 50 44Z" fill="none" stroke="var(--teal, #1F7A6C)" stroke-width="3" stroke-linejoin="round"/>`;
  const rain = `${cloud}<g stroke="var(--teal, #1F7A6C)" stroke-width="3" stroke-linecap="round"><line x1="22" y1="50" x2="19" y2="58"/><line x1="32" y1="50" x2="29" y2="58"/><line x1="42" y1="50" x2="39" y2="58"/></g>`;
  const snow = `${cloud}<g fill="var(--teal, #1F7A6C)"><circle cx="20" cy="53" r="2.2"/><circle cx="32" cy="57" r="2.2"/><circle cx="44" cy="53" r="2.2"/></g>`;
  const storm = `${cloud}<path d="M30 48 24 58h8l-4 8 12-13h-8l4-5Z" fill="var(--amber-deep, #C97316)" stroke="none"/>`;
  const fog = `<g stroke="var(--ink-soft, #5A6B85)" stroke-width="3" stroke-linecap="round"><line x1="10" y1="26" x2="54" y2="26"/><line x1="10" y1="36" x2="54" y2="36"/><line x1="10" y1="46" x2="54" y2="46"/></g>`;
  const partly = `<g>${sunPath.replace(/r="13"/, 'r="9"').replace('cx="32" cy="32"', 'cx="24" cy="22"')}</g>
    <path d="M18 46a9 9 0 0 1 2.5-17.6A11.5 11.5 0 0 1 42 30.5 9.5 9.5 0 0 1 40 46Z" fill="none" stroke="var(--teal, #1F7A6C)" stroke-width="3" stroke-linejoin="round"/>`;

  let inner;
  if (c === 0) inner = sunPath;
  else if (c === 1 || c === 2) inner = partly;
  else if (c === 3 || c === 45 || c === 48) inner = c >= 45 ? fog : cloud;
  else if ([51,53,55,61,63,65,80,81,82].includes(c)) inner = rain;
  else if ([71,73,75].includes(c)) inner = snow;
  else if ([95,96,99].includes(c)) inner = storm;
  else inner = cloud;

  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function renderToday(place, current) {
  const label = [place.name, place.admin, place.country].filter(Boolean).join(", ");
  document.getElementById("place-name").textContent = label;
  document.getElementById("today-date").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  document.getElementById("today-temp").textContent = Math.round(current.temperature_2m);
  document.getElementById("today-desc").textContent = WEATHER_CODES[current.weather_code] || "—";
  document.getElementById("today-feels").textContent = `${Math.round(current.apparent_temperature)}°`;
  document.getElementById("today-wind").textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  document.getElementById("today-humidity").textContent = `${Math.round(current.relative_humidity_2m)}%`;
  document.getElementById("today-icon").innerHTML = weatherIcon(current.weather_code);
}

function renderHistory(history, current) {
  const chart = document.getElementById("chart");
  const note = document.getElementById("history-note");

  if (history.length === 0) {
    chart.innerHTML = "";
    note.textContent = "No historical data available for this location.";
    return;
  }

  const points = [...history, { year: "today", avg: current.temperature_2m, isToday: true }];
  const values = points.map((p) => p.avg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Fixed viewBox coordinate space; SVG scales to container width via CSS (width:100%).
  const width = 640;
  const height = 220;
  const padX = 36;
  const padY = 34;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * plotW;
    const y = padY + (1 - (p.avg - min) / range) * plotH;
    return { ...p, x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  const dots = coords.map((c) => {
    const color = c.isToday ? "#C97316" : "#1F7A6C";
    const r = c.isToday ? 6 : 4;
    return `
      <circle cx="${c.x}" cy="${c.y}" r="${r}" fill="${color}" />
      <text x="${c.x}" y="${c.y - 14}" text-anchor="middle" font-size="12" fill="#16233A" font-family="IBM Plex Mono, monospace">${Math.round(c.avg)}°</text>
      <text x="${c.x}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#5A6B85" font-family="IBM Plex Mono, monospace">${c.isToday ? "today" : c.year}</text>
    `;
  }).join("");

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Temperature on this date across past years">
      <path d="${linePath}" fill="none" stroke="#DDE6EE" stroke-width="2" />
      ${dots}
    </svg>
  `;

  const coldest = history.reduce((a, b) => (a.avg < b.avg ? a : b));
  const warmest = history.reduce((a, b) => (a.avg > b.avg ? a : b));
  note.textContent = `Over the last ${history.length} years, this date ranged from ${Math.round(coldest.avg)}° (${coldest.year}) to ${Math.round(warmest.avg)}° (${warmest.year}). Today: ${Math.round(current.temperature_2m)}°.`;
}
