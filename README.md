# homebridge-weather

**Homebridge plugin for displaying the weather, humidity and min- or max-temperature from openweathermap.org**

[![NPM version](https://badge.fury.io/js/homebridge-weather.svg)](https://npmjs.org/package/homebridge-weather) [![Dependency Status](https://david-dm.org/werthdavid/homebridge-weather.svg)](https://david-dm.org/werthdavid/homebridge-weather) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com) [![Downloads](https://img.shields.io/npm/dm/homebridge-weather.svg)](https://npmjs.org/package/homebridge-weather)


# Installation

1. Install Homebridge using: `(sudo) npm install -g --unsafe-perm homebridge`
2. Install this plugin using: `(sudo) npm install -g homebridge-weather`
3. Get an API-Key from <a href="http://openweathermap.org">openweathermap.org</a>
4. <a href="https://openweathermap.org/city">Find</a> your city (make sure the query only returns a single result!). Alternatively you can use a different query parameter (see 'Fields')
5. Update your Homebridge `config.json` using the sample below (append in the block 'accessories' not 'platforms').

# Configuration

## Weather

Example for configuration by City

```json
"accessories": [
    {
      "accessory": "Weather",
      "apikey": "YOUR_KEY_HERE",
      "location": "Stuttgart,de",
      "name": "OpenWeatherMap Temperature"
    }
]
```

### By ID

replace `location` with

```json
"locationById": "2172797",
```

### By Coordinates

replace `location` with

```json
"locationByCoordinates": "lat=48.70798341&lon=9.17019367",
```


## Forecast

To show daily min/max values, you have to add two additional accessories:

```json
"accessories": [
  {
     "accessory":"Weather",
     "apikey":"YOUR_KEY_HERE",
     "locationByCoordinates":"lat=48.70798341&lon=9.17019367",
     "name":"Today Min",
     "type":"min"
  },
  {
     "accessory":"Weather",
     "apikey":"YOUR_KEY_HERE",
     "locationByCoordinates":"lat=48.70798341&lon=9.17019367",
     "name":"Today Max",
     "type":"max"
  }
]
```

**You can add multiple accessories if you want to display additional information like min/max or the temperature of different locations. Just make sure that the field `name` is unique**


## Polling

By default, no polling-interval is specified. That means, the temperature is only updated when the Home-App is opened. 
There might be scenarios though, where you would want to periodically update the temperature e.g. as source for trigger-rules.

OpenWeatherMap has a generous amount of [free calls](http://openweathermap.org/price#weather) per API-key: you can poll the temperature up to 60 times a minute.
Beware that **just because you can doesn't mean you should**

I'd also suggest that you add a polling-interval only for the `type` *current*, since *min* and *max* are forecasts and probably won't change throughout the day.

## Config file


Take a look at the <a href="config.example.json">example config.json</a>


Fields:

* `accessory` must be "Weather" (required).
* `apikey` API-Key for accessing OpenWeatherMap API (required).
* `location` city-name query string (resembles to <a href="https://openweathermap.org/current#name">q-parameter</a>) (required).
* OR `locationById` cityid query string (resembles to <a href="https://openweathermap.org/current#cityid">cityid-parameter</a>) (required).
* OR `locationByCoordinates` geo query string (resembles to <a href="https://openweathermap.org/current#geo">geo-parameter</a>) (required).
* OR `locationByZip` zip query string (resembles to <a href="https://openweathermap.org/current#zip">zip-parameter</a>) (required).
* `name` is the name of the published accessory (required).
* `showHumidity` weather or not show the humidity (optional, only works for current weather not forecast).
* `type` the type of the displayed value, either "min", "max" or "current" (optional, defaults to "current")
* `pollingInterval` the time (in minutes) for periodically updating the temperature (optional, defaults to 0 which means polling only happens when opening the Home-App)