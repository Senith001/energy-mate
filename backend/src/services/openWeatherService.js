import axios from "axios";

const BASE_URL = "https://api.openweathermap.org/data/2.5";

/**
 * Fetch current weather for a city using OpenWeatherMap API (free tier).
 * @param {string} city - City name (e.g. "Colombo")
 * @returns {Promise<Object>} Simplified weather data
 */
async function getCurrentWeather(city) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY is not configured");

  const { data } = await axios.get(`${BASE_URL}/weather`, {
    params: { q: city, appid: apiKey, units: "metric" },
  });

  return {
    city: data.name,
    country: data.sys.country,
    temperature: data.main.temp,
    feelsLike: data.main.feels_like,
    humidity: data.main.humidity,
    description: data.weather[0].description,
    windSpeed: data.wind.speed,
  };
}

/**
 * Fetch 5-day / 3-hour forecast and return daily averages.
 * @param {string} city
 * @returns {Promise<Object>}
 */
async function getForecast(city) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY is not configured");

  const { data } = await axios.get(`${BASE_URL}/forecast`, {
    params: { q: city, appid: apiKey, units: "metric" },
  });

  // Group by date and compute daily averages
  const dailyMap = {};
  for (const entry of data.list) {
    const date = entry.dt_txt.split(" ")[0];
    if (!dailyMap[date]) dailyMap[date] = { temps: [], humidities: [] };
    dailyMap[date].temps.push(entry.main.temp);
    dailyMap[date].humidities.push(entry.main.humidity);
  }

  const forecast = Object.entries(dailyMap).map(([date, vals]) => ({
    date,
    avgTemp: +(vals.temps.reduce((a, b) => a + b, 0) / vals.temps.length).toFixed(1),
    avgHumidity: +(vals.humidities.reduce((a, b) => a + b, 0) / vals.humidities.length).toFixed(1),
  }));

  return { city: data.city.name, country: data.city.country, forecast };
}

export { getCurrentWeather, getForecast };
