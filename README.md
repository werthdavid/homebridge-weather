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

#### By ID

replace `location` with

```json
"locationById": "2172797",
```

#### By Coordinates

replace `location` with

```json
"locationByCoordinates": "lat=48.70798341&lon=9.17019367",
```

### Celsius/Fahrenheit

add `unit` with one of the following values:

```json
"unit": "metric",
```
for Celsius (default)

or

```json
"unit": "imperial",
```
for Fahrenheit

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

## Cloudiness

To show cloudiness in percent configure as follows:

```json
"accessories": [
  {
     "accessory":"Weather",
     "apikey":"YOUR_KEY_HERE",
     "locationByCoordinates":"lat=48.70798341&lon=9.17019367",
     "name":"Cloudiness",
     "type":"clouds"
  }
]
```

## Sunrise/noon/sunset

This type publishes a value between 0 and 100 that indicates how far through the day we are where 0% is the sunrise (and everything before) and 100% is sunset (and everything after). 50% is noon accordingly.

For using this value as trigger, you have to define a "pollingInterval" as well, otherwise the value only gets updated while having HomeApp in foreground.

```json
"accessories": [
  {
     "accessory":"Weather",
     "apikey":"YOUR_KEY_HERE",
     "locationByCoordinates":"lat=48.70798341&lon=9.17019367",
     "name":"Sun",
     "type":"sun",
     "pollingInterval": 10
  }
]
```

## Hint

**You can add multiple accessories if you want to display additional information like min/max or the temperature of different locations. Just make sure that the field `name` is unique**


## Polling

By default, no polling-interval is specified. That means, the temperature is only updated when the Home-App is opened. 
There might be scenarios though, where you would want to periodically update the temperature e.g. as source for trigger-rules.

OpenWeatherMap has a generous amount of [free calls](http://openweathermap.org/price#weather) per API-key: you can poll the temperature up to 60 times a minute.
Beware that **just because you can doesn't mean you should**

I'd also suggest that you add a polling-interval only for the `type` *current*, since *min* and *max* are forecasts and probably won't change throughout the day.

## Temperature profile with [Elgato Eve App](https://itunes.apple.com/de/app/elgato-eve/id917695792?mt=8) ([FakeGato](https://github.com/simont77/fakegato-history) support)

With the `enableHistory` flag, the FakeGato-service is used to log temperature and humidity. This doesn't work with the default Home-App, you have to use the Elgato Eve App.

![eve-example](https://user-images.githubusercontent.com/4696067/35668836-601c4a10-0733-11e8-982e-fa2a406a46e7.jpg)

Since FakeGato requires to log an entry at least every 10 minutes, this feature only becomes active if you set `enableHistory` to true AND define an `pollingInterval`!

I suggest the following settings:

```json
"accessories": [
    {
       "accessory": "Weather",
       "apikey": "YOUR_KEY_HERE",
       "location": "Stuttgart,de",
       "name": "OpenWeatherMap Temperature",
       "pollingInterval": 10,
       "enableHistory": true
     }
]
```

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
* `showHumidity` weather or not show the humidity (optional, only works for current weather not forecast, defaults to true).
* `nameHumidity` humidity can have a different name (optional, only works if `showHumidity` is true, defaults to the same as `name`).
* `type` the type of the displayed value, either `min`, `max`, `current`, `clouds` or `sun` (optional, defaults to `current`)
* `pollingInterval` the time (in minutes) for periodically updating the temperature (optional, defaults to 0 which means polling only happens when opening the Home-App)
* `enableHistory` flag for enabling the FakeGato-service (see above) for temperature and humidity logging (optional, defaults to false, only works when polling is enabled)
* `unit` change the temperature unit to Celsius or Fahrenheit (optional, defaults to `metric` (Celsius), if you want Fahrenheit use `imperial`)

## Known Issues

* Default Home-App can't trigger scenes: try [Hesperus App](https://itunes.apple.com/de/app/hesperus/id969348892?mt=8) instead