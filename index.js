"use strict";

var Service, Characteristic;
var temperatureService;
var humidityService;
var request = require("request");

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-weather", "Weather", WeatherAccessory);
};

function WeatherAccessory(log, config) {
    this.log = log;
    this.name = config["name"];
    this.apikey = config["apikey"];
    this.locationByCity = config["location"];
    this.locationById = config["locationById"];
    this.locationByCoordinates = config["locationByCoordinates"];
    this.locationByZip = config["locationByZip"];
    if (config["showHumidity"] != null) {
        this.showHumidity = config["showHumidity"];
    } else {
        this.showHumidity = true;
    }
    if (config["pollingInterval"] != null) {
        this.pollingInterval = parseInt(config["pollingInterval"]) * 1000 * 60;
    } else {
        this.pollingInterval = 0;
    }

    this.type = config["type"] || "current";
    this.cachedWeatherObj = undefined;
    this.lastupdate = 0;

    // start periodical polling in background with setTimeout
    if (this.pollingInterval > 0) {
        var that = this;
        setTimeout(function () {
            that.backgroundPolling();
        }, this.pollingInterval);
    }
}

WeatherAccessory.prototype =
    {
        backgroundPolling: function () {
            this.log.info("Polling data in background");
            this.getStateTemp(function (error, temperature) {
                if (!error && temperature != null) {
                    temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                }
            }.bind(this));
            this.getStateHum(function (error, humidity) {
                if (!error && humidity != null) {
                    humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, humidity);
                }
            }.bind(this));

            var that = this;
            setTimeout(function () {
                that.backgroundPolling();
            }, this.pollingInterval);
        },

        getStateTemp: function (callback) {
            // Only fetch new data once per minute
            if (!this.cachedWeatherObj || this.pollingInterval > 0 || this.lastupdate + 60 < (Date.now() / 1000 | 0)) {
                var url = this.makeURL();
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        this.cachedWeatherObj = JSON.parse(responseBody);
                        this.lastupdate = (Date.now() / 1000);
                        var temperature = this.returnTemp();
                        callback(null, temperature);
                    }
                }.bind(this));
            } else {
                var temperature = this.returnTemp();
                this.log("Returning cached data", temperature);
                callback(null, temperature);
            }
        },

        getStateHum: function (callback) {
            // Only fetch new data once per minute
            if (!this.cachedWeatherObj || this.pollingInterval > 0 || this.lastupdate + 60 < (Date.now() / 1000 | 0)) {
                var url = this.makeURL();
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        this.cachedWeatherObj = JSON.parse(responseBody);
                        this.lastupdate = (Date.now() / 1000);
                        var humidity = parseFloat(this.cachedWeatherObj["main"]["humidity"]);
                        callback(null, humidity);
                    }
                }.bind(this));
            } else {
                var humidity = parseFloat(this.cachedWeatherObj["main"]["humidity"]);
                this.log("Returning cached data", humidity);
                // temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                callback(null, humidity);
            }
        },

        returnTemp: function () {
            var temperature = 0;
            if (this.cachedWeatherObj) {
                if (this.type === "min") {
                    temperature = parseFloat(this.cachedWeatherObj["list"][0]["temp"]["min"]);
                } else if (this.type === "max") {
                    temperature = parseFloat(this.cachedWeatherObj["list"][0]["temp"]["max"]);
                } else {
                    temperature = parseFloat(this.cachedWeatherObj["main"]["temp"]);
                }
                this.log("Fetched temperature " + temperature + " of type " + this.type + " for " + this.name);
            }
            return temperature;
        },

        makeURL: function () {
            var url = "http://api.openweathermap.org/data/2.5/";
            if (this.type === "current") {
                url += "weather"
            } else {
                url += "forecast/daily"
            }

            url += "?APPID=" + this.apikey + "&units=metric&";
            if (this.locationByCity) {
                url += "q=" + this.locationByCity;
            } else if (this.locationById) {
                url += "id=" + this.locationById;
            } else if (this.locationByCoordinates) {
                url += this.locationByCoordinates;
            } else if (this.locationByZip) {
                url += "zip=" + this.locationByZip;
            }
            return url;
        },

        identify: function (callback) {
            this.log("Identify requested");
            callback();
        },

        getServices: function () {
            var informationService = new Service.AccessoryInformation();

            informationService
                .setCharacteristic(Characteristic.Manufacturer, "OpenWeatherMap")
                .setCharacteristic(Characteristic.Model, "Location")
                .setCharacteristic(Characteristic.SerialNumber, "XDWS13");

            temperatureService = new Service.TemperatureSensor(this.name);
            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .on("get", this.getStateTemp.bind(this));

            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({minValue: -30});

            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({maxValue: 120});

            if (this.showHumidity && this.type === "current") {
                humidityService = new Service.HumiditySensor(this.name);
                humidityService
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on("get", this.getStateHum.bind(this));

                return [informationService, temperatureService, humidityService];
            } else {
                return [informationService, temperatureService];
            }

        },

        httpRequest: function (url, callback) {
            request({
                    url: url,
                    body: "",
                    method: "GET",
                    rejectUnauthorized: false
                },
                function (error, response, body) {
                    callback(error, response, body)
                })
        }

    };

if (!Date.now) {
    Date.now = function () {
        return new Date().getTime();
    }
}
