
import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  Search,
  MapPin,
  LoaderCircle,
} from "lucide-react";

import "./Weather.css";

const DEFAULT_CITY = {
  name: "Nairobi",
  country: "Kenya",
  latitude: -1.2864,
  longitude: 36.8172,
};

function getWeatherInfo(code, isDay = 1) {
  if (code === 0) {
    return {
      description: "Clear sky",
      Icon: isDay ? Sun : Moon,
    };
  }

  if (code === 1 || code === 2) {
    return {
      description: "Partly cloudy",
      Icon: isDay ? CloudSun : Cloud,
    };
  }

  if (code === 3) {
    return { description: "Overcast", Icon: Cloud };
  }

  if (code === 45 || code === 48) {
    return { description: "Foggy", Icon: Cloud };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return { description: "Drizzle", Icon: CloudDrizzle };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { description: "Rain", Icon: CloudRain };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { description: "Snow", Icon: Cloud };
  }

  if ([95, 96, 99].includes(code)) {
    return { description: "Thunderstorm", Icon: CloudRain };
  }

  return { description: "Weather unavailable", Icon: Cloud };
}

function formatTime(time) {
  const [hours, minutes] = time.slice(11, 16).split(":");
  const hour = Number(hours);
  const suffix = hour >= 12 ? "PM" : "AM";

  return `${hour % 12 || 12}:${minutes} ${suffix}`;
}

function Weather() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(DEFAULT_CITY);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadWeather(place) {
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const params = new URLSearchParams({
        latitude: String(place.latitude),
        longitude: String(place.longitude),
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day",
        hourly:
          "temperature_2m,weather_code,precipitation_probability,is_day",
        timezone: "auto",
        forecast_days: "2",
      });

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`
      );

      if (!response.ok) {
        throw new Error("Could not retrieve weather data. Please try again.");
      }

      const data = await response.json();

      if (!data.current || !data.hourly) {
        throw new Error("Weather data is unavailable for this location.");
      }

      const foundIndex = data.hourly.time.findIndex(
        (time) => time === data.current.time
      );

      const currentIndex = foundIndex >= 0 ? foundIndex : 0;

      const hours = data.hourly.time
        .slice(currentIndex, currentIndex + 5)
        .map((time, index) => {
          const i = currentIndex + index;

          return {
            time,
            temp: data.hourly.temperature_2m[i],
            code: data.hourly.weather_code[i],
            isDay: data.hourly.is_day[i],
            rain: data.hourly.precipitation_probability[i],
          };
        });

      setWeather(data.current);
      setForecast(hours);
      setCity(place);
      setQuery(
        `${place.name}${place.country ? `, ${place.country}` : ""}`
      );
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function searchCity(event) {
    event.preventDefault();

    const searchTerm = query.trim();

    if (!searchTerm) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const params = new URLSearchParams({
        name: searchTerm,
        count: "10",
        language: "en",
        format: "json",
      });

      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?${params}`
      );

      if (!response.ok) {
        throw new Error("City search failed. Please try again.");
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        setError("No matching cities found. Check the spelling.");
        return;
      }

      const places = data.results.map((item) => ({
        name: item.name,
        country: item.country || "",
        admin1: item.admin1 || "",
        latitude: item.latitude,
        longitude: item.longitude,
      }));

      setResults(places);
    } catch (err) {
      setError(err.message || "Unable to search for that city.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
  async function fetchInitialWeather() {
    await loadWeather(DEFAULT_CITY);
  }

  fetchInitialWeather();
}, []);

  const currentInfo = weather
    ? getWeatherInfo(weather.weather_code, weather.is_day)
    : { description: "Loading weather...", Icon: CloudSun };

  const CurrentIcon = currentInfo.Icon;

  return (
    <main className="weather-container">
      <header className="weather-search-header">
        <h1>Weather</h1>
        <p>Discover weather around the world</p>
      </header>

      <form className="weather-search" onSubmit={searchCity}>
        <Search size={20} />

        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search any city worldwide..."
          aria-label="Search for a city"
        />

        <button type="submit" disabled={loading}>
          Search
        </button>
      </form>

      {results.length > 0 && (
        <div className="city-results">
          <p className="results-heading">Choose a location</p>

          {results.map((place, index) => (
            <button
              type="button"
              className="city-result"
              key={`${place.name}-${place.latitude}-${index}`}
              onClick={() => loadWeather(place)}
              disabled={loading}
            >
              <MapPin size={18} />

              <span>
                <strong>{place.name}</strong>
                <small>
                  {[place.admin1, place.country]
                    .filter(Boolean)
                    .join(", ")}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="weather-status">
          <LoaderCircle className="loading-icon" size={19} />
          Getting weather information...
        </p>
      )}

      {error && (
        <p className="weather-error" role="alert">
          {error}
        </p>
      )}

      <section className="weather-dashboard">
        <div className="weather-card">
          <div className="weather-heading">
            <div>
              <p className="weather-label">CURRENT WEATHER</p>

              <h2>
                {city.name}
                {city.country ? `, ${city.country}` : ""}
              </h2>

              <p className="weather-description">
                {currentInfo.description}
              </p>
            </div>

            <CurrentIcon
              className="main-weather-icon"
              size={76}
              strokeWidth={1.5}
            />
          </div>

          <div className="temperature">
            {weather ? `${Math.round(weather.temperature_2m)}°C` : "--°C"}
          </div>

          <p className="feels-like">
            Feels like{" "}
            {weather
              ? `${Math.round(weather.apparent_temperature)}°C`
              : "--"}
          </p>

          <div className="weather-details">
            <div>
              <span>Humidity</span>
              <strong>
                {weather ? `${weather.relative_humidity_2m}%` : "--"}
              </strong>
            </div>

            <div>
              <span>Wind</span>
              <strong>
                {weather ? `${weather.wind_speed_10m} km/h` : "--"}
              </strong>
            </div>

            <div>
              <span>Precipitation</span>
              <strong>
                {weather ? `${weather.precipitation} mm` : "--"}
              </strong>
            </div>
          </div>
        </div>

        <div className="forecast-card">
          <h3>Hourly Forecast</h3>

          <div className="forecast-list">
            {forecast.map((item) => {
              const info = getWeatherInfo(item.code, item.isDay);
              const ForecastIcon = info.Icon;

              return (
                <div className="forecast-item" key={item.time}>
                  <span className="forecast-time">
                    {formatTime(item.time)}
                  </span>

                  <ForecastIcon
                    className="forecast-icon"
                    size={27}
                    aria-label={info.description}
                  />

                  <strong>{Math.round(item.temp)}°C</strong>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Weather;