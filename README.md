# homebridge-weather

A homebridge temperature sensor for displaying the weather at your current location.

# Installation

1. Install Homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-weather`
3. Get an API-Key from <a href="http://openweathermap.org">openweathermap.org</a>
4. <a href="https://openweathermap.org/city">Find</a> your city (make sure the query only returns a single result). Alternatively you can use a different query parameter (see 'Fields')
5. Update your Homebridge `config.json` using the sample below.

# Configuration

## By City

```json
{
  "accessory": "Weather",
  "apikey": "YOUR_KEY_HERE",
  "location": "Stuttgart,de",
  "name": "OpenWeatherMap Temperature"
}
```

## By ID

```json
{
  "accessory": "Weather",
  "apikey": "YOUR_KEY_HERE",
  "locationById": "2172797",
  "name": "OpenWeatherMap Temperature"
}
```

## By Coordinates

```json
{
  "accessory": "Weather",
  "apikey": "YOUR_KEY_HERE",
  "locationByCoordinates": "lat=35&lon=139",
  "name": "OpenWeatherMap Temperature"
}
```

Fields:

* `accessory` must be "Weather" (required).
* `apikey` API-Key for accessing OpenWeatherMap API (required).
* `location` city-name query string (resembles to <a href="https://openweathermap.org/current#name">q-parameter</a>) (required).
* OR `locationById` cityid query string (resembles to <a href="https://openweathermap.org/current#cityid">cityid-parameter</a>) (required).
* OR `locationByCoordinates` geo query string (resembles to <a href="https://openweathermap.org/current#geo">geo-parameter</a>) (required).
* OR `locationByZip` zip query string (resembles to <a href="https://openweathermap.org/current#zip">zip-parameter</a>) (required).
* `name` is the name of the published accessory (required).
