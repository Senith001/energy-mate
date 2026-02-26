export async function getWeatherByCity(city) {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=1&language=en&format=json`;

  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) throw new Error("Geocoding API request failed");
  const geoData = await geoRes.json();

  const place = geoData?.results?.[0];
  if (!place) throw new Error("City not found in geocoding");

  const { latitude, longitude, name, country, timezone } = place;

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=${encodeURIComponent(
    timezone || "auto"
  )}`;

  const wRes = await fetch(weatherUrl);
  if (!wRes.ok) throw new Error("Weather API request failed");
  const wData = await wRes.json();

  const temp = wData?.current?.temperature_2m;

  return {
    location: `${name}${country ? ", " + country : ""}`,
    latitude,
    longitude,
    timezone: timezone || "auto",
    temperature: temp
  };
}

export function generateEnergyTip(temperature) {
  if (temperature === undefined || temperature === null) return "No temperature data available.";

  if (temperature >= 30) {
    return "Hot weather: reduce fan/AC time and use natural ventilation to save electricity.";
  }
  if (temperature <= 20) {
    return "Cool weather: avoid unnecessary heating and switch off unused appliances.";
  }
  return "Moderate weather: keep appliances off when not needed and use energy-efficient lighting.";
}