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
    setStatus("Something went wrong fetching weather data. Please try again.", true);
  }
}

function setStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.toggle("error", isError);
}

async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const r = data.results[0];
  return {
    name: r.name,
    admin: r.admin1 || "",
    country: r.country || "",
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  };
}

async function fetchCurrent(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  return data.current;
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
      const data = await res.json();
      const max = data?.daily?.temperature_2m_max?.[0];
      const min = data?.daily?.temperature_2m_min?.[0];
      if (max == null || min == null) return null;
      return { year, max, min, avg: (max + min) / 2 };
    } catch {
      return null;
    }
  });

  const settled = await Promise.all(requests);
  return settled.filter(Boolean).sort((a, b) => a.year - b.year);
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

  const width = Math.max(560, points.length * 90);
  const height = 200;
  const padX = 40;
  const padY = 30;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * plotW;
    const y = padY + (1 - (p.avg - min) / range) * plotH;
    return { ...p, x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  const dots = coords.map((c) => {
    const color = c.isToday ? "#E8952E" : "#1F7A6C";
    const r = c.isToday ? 6 : 4;
    return `
      <circle cx="${c.x}" cy="${c.y}" r="${r}" fill="${color}" />
      <text x="${c.x}" y="${c.y - 14}" text-anchor="middle" font-size="12" fill="#16233A" font-family="IBM Plex Mono, monospace">${Math.round(c.avg)}°</text>
      <text x="${c.x}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#4B5A75" font-family="IBM Plex Mono, monospace">${c.isToday ? "today" : c.year}</text>
    `;
  }).join("");

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Temperature on this date across past years">
      <path d="${linePath}" fill="none" stroke="#D3DEE8" stroke-width="2" />
      ${dots}
    </svg>
  `;

  const coldest = history.reduce((a, b) => (a.avg < b.avg ? a : b));
  const warmest = history.reduce((a, b) => (a.avg > b.avg ? a : b));
  note.textContent = `Over the last ${history.length} years, this date ranged from ${Math.round(coldest.avg)}° (${coldest.year}) to ${Math.round(warmest.avg)}° (${warmest.year}). Today: ${Math.round(current.temperature_2m)}°.`;
}
