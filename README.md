# homebridge-weather

A homebridge plugin that acts as temperature sensor for displaying the weather, humidity and min- or max-temperature at your current location based on openweathermap.org

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
...
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


**You can add multiple accessories if you want to display additional information like min/max or the temperature of different locations. Just make sure that the filed `name` is unique**

Take a look at the <a href="blob/master/config.example.json">example config.json</a>


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