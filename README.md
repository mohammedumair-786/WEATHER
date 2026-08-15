# 🌦️ Weather Time Machine

See today's weather for any city — then scroll back and see what this **exact same date** looked like over the past 6 years.

No sign-up, no API key. Powered entirely by the free [Open-Meteo](https://open-meteo.com) API.

**Live demo:** [https://mohammedumair-786.github.io/WEATHER/](https://mohammedumair-786.github.io/WEATHER/)


## ✨ Why this is different

Most weather demos just show today's forecast. This one turns weather into a small time-travel toy: search a city and get a strip-chart of "this day in history" — great for spotting warming trends, freak cold snaps, or just fun trivia like "5 years ago today it was 10° colder here."

## 📸 Demo

Type a city → get today's conditions + a 6-year temperature timeline for that calendar date, rendered as a hand-drawn-style line chart.

## 🛠️ Tech Stack

- Vanilla HTML / CSS / JavaScript — no build step, no dependencies
- [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api) — city → coordinates
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs) — current conditions
- [Open-Meteo Historical Archive API](https://open-meteo.com/en/docs/historical-weather-api) — past-years data

## 📦 Getting Started

Clone it and just open the file — that's it, no install step:

```bash
git clone https://github.com/your-username/weather-time-machine.git
cd weather-time-machine
open index.html   # or double-click it, or use a local server
```

Or run a quick local server (avoids some browsers' file:// restrictions):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## 🚀 Deploying

Since it's static files, you can host it for free on **GitHub Pages**:

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Set source to your `main` branch, root folder
4. Your app will be live at `https://your-username.github.io/weather-time-machine`

## 📁 Project Structure

```
weather-time-machine/
├── index.html    # markup
├── style.css     # weather-station inspired styling
├── script.js     # geocoding, fetch logic, SVG chart rendering
└── README.md
```

## 🔮 Ideas to Extend

- Cache results in `localStorage` so repeat lookups don't re-fetch
- Add a toggle for °F / °C
- Show precipitation and wind history alongside temperature
- Let users compare two cities side by side
- Add a "random city" button for weather-trivia exploring

