"use strict";

var Service, Characteristic, FakeGatoHistoryService;
var temperatureService;
var humidityService;
var request = require("request");
var os = require("os");
var hostname = os.hostname();

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    FakeGatoHistoryService = require('fakegato-history')(homebridge);
    homebridge.registerAccessory("homebridge-weather", "Weather", WeatherAccessory);
};

function WeatherAccessory(log, config) {
    this.log = log;
    // FakeGato
    this.fakeGateHistoryService = undefined;
    // Load settings from the config
    this.name = config["name"];
    // Humidity-sensor can have a divergent name
    this.nameHumidity = config["nameHumidity"] || config["name"];
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
    if (config["enableHistory"] != null) {
        this.enableHistory = config["enableHistory"];
    } else {
        this.enableHistory = false;
    }

    this.type = config["type"] || "current";
    this.cachedWeatherObj = undefined;
    this.lastupdate = 0;

    // start periodical polling in background with setTimeout
    if (this.pollingInterval > 0) {
        this.log("Starting Polling background service for", this.name);
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
            if (!this.cachedWeatherObj || this.pollingInterval > 0 || this.lastupdate + 60 < (new Date().getTime() / 1000 | 0)) {
                var url = this.makeURL();
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        this.cachedWeatherObj = JSON.parse(responseBody);
                        this.lastupdate = (new Date().getTime() / 1000);
                        var temperature = this.returnTempFromCache();
                        this.addHistoryTemperature(temperature);
                        callback(null, temperature);
                    }
                }.bind(this));
            } else {
                var temperature = this.returnTempFromCache();
                this.log("Returning cached data", temperature);
                this.addHistoryTemperature(temperature);
                callback(null, temperature);
            }
        },

        getStateHum: function (callback) {
            // Only fetch new data once per minute
            if (!this.cachedWeatherObj || this.pollingInterval > 0 || this.lastupdate + 60 < (new Date().getTime() / 1000 | 0)) {
                var url = this.makeURL();
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        this.cachedWeatherObj = JSON.parse(responseBody);
                        this.lastupdate = (new Date().getTime() / 1000);
                        var humidity = parseFloat(this.cachedWeatherObj["main"]["humidity"]);
                        this.addHistoryHumidity(humidity);
                        callback(null, humidity);
                    }
                }.bind(this));
            } else {
                var humidity = parseFloat(this.cachedWeatherObj["main"]["humidity"]);
                this.log("Returning cached data", humidity);
                this.addHistoryHumidity(humidity);
                callback(null, humidity);
            }
        },

        returnTempFromCache: function () {
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

        /**
         * Log the humidity to the FakeGato-service.
         * Only works if enableHistory is true and  pollingInterval > 0
         * @param humidity
         */
        addHistoryHumidity: function (humidity) {
            if (this.enableHistory && this.pollingInterval > 0 && this.fakeGateHistoryService && humidity) {
                this.fakeGateHistoryService.addEntry({
                    time: new Date().getTime() / 1000,
                    humidity: humidity
                });
            }
        },

        /**
         * Log the temperature to the FakeGato-service.
         * Only works if enableHistory is true and  pollingInterval > 0
         * @param temperature
         */
        addHistoryTemperature: function (temperature) {
            if (this.enableHistory && this.pollingInterval > 0 && this.fakeGateHistoryService && temperature) {
                this.fakeGateHistoryService.addEntry({
                    time: new Date().getTime() / 1000,
                    temperature: temperature
                });
            }
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
                .setCharacteristic(Characteristic.SerialNumber, hostname + "-" + this.name);

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

            // FakeGato
            temperatureService.log = this.log;
            this.fakeGateHistoryService = new FakeGatoHistoryService("weather", temperatureService, 4032);

            if (this.showHumidity && this.type === "current") {
                humidityService = new Service.HumiditySensor(this.nameHumidity);
                humidityService
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on("get", this.getStateHum.bind(this));

                return [informationService, temperatureService, humidityService, this.fakeGateHistoryService];
            } else {
                return [informationService, temperatureService, this.fakeGateHistoryService];
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

