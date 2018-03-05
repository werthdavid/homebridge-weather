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
    FakeGatoHistoryService = require("fakegato-history")(homebridge);
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

    if (this.enableHistory && this.pollingInterval > 0) {
        this.fakeGateHistoryService = new FakeGatoHistoryService("weather", this, 4032, this.pollingInterval);
    }

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
            // Update Temperature
            this.getStateTemp(function (error, temperature) {
                if (!error && temperature != null) {
                    temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                }
            }.bind(this));

            // Update Humidity if configured
            if (this.showHumidity && this.type === "current") {
                this.getStateHum(function (error, humidity) {
                    if (!error && humidity != null) {
                        humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, humidity);
                    }
                }.bind(this));
            }

            var that = this;
            setTimeout(function () {
                // Recursive call after certain time
                that.backgroundPolling();
            }, this.pollingInterval);
        },

        /**
         * Get's the temperature either from Cache or from HTTP
         * @param callback
         */
        getStateTemp: function (callback) {
            // Only fetch new data once per minute
            if (!this.cachedWeatherObj || this.pollingInterval > 0 || this.lastupdate + 60 < (new Date().getTime() / 1000 | 0)) {
                var url = this.makeURL();
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        this.setCacheObj(responseBody);
                        var temperature = this.returnTempFromCache();
                        callback(null, temperature);
                    }
                }.bind(this));
            } else {
                var temperature = this.returnTempFromCache();
                this.log("Returning cached data", temperature);
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
                        this.setCacheObj(responseBody);
                        var humidity = this.returnHumFromCache();
                        callback(null, humidity);
                    }
                }.bind(this));
            } else {
                var humidity = this.returnHumFromCache();
                this.log("Returning cached data", humidity);
                callback(null, humidity);
            }
        },

        /**
         * Handles the response from HTTP-API and caches the data
         * @param responseBody
         */
        setCacheObj: function (responseBody) {
            this.log.debug("Server response:", responseBody);
            this.cachedWeatherObj = JSON.parse(responseBody);
            this.lastupdate = (new Date().getTime() / 1000);
            var temperature = this.returnTempFromCache();
            var humidity;
            if (this.showHumidity && this.type === "current") {
                humidity = this.returnHumFromCache();
            }
            this.addHistory(temperature, humidity);
        },

        returnTempFromCache: function () {
            var temperature;
            if (this.cachedWeatherObj) {
                if (this.type === "min") {
                    // Unfortunately we cannot use the "16 day weather forecast" API but the "5 day / 3 hour forecast" instead.
                    // this API gives one min/max every 3 hours but we want the daily min/max so we have to iterate over all those data
                    var min = parseFloat(this.cachedWeatherObj["list"][0]["main"]["temp_min"]);
                    for (var i = 0, len = this.cachedWeatherObj["list"].length; i < len; i++) {
                        if (parseFloat(this.cachedWeatherObj["list"][i]["main"]["temp_min"]) < min) {
                            min = parseFloat(this.cachedWeatherObj["list"][i]["main"]["temp_min"]);
                        }
                    }
                    temperature = min;
                } else if (this.type === "max") {
                    var max = parseFloat(this.cachedWeatherObj["list"][0]["main"]["temp_max"]);
                    for (var j = 0, len2 = this.cachedWeatherObj["list"].length; j < len2; j++) {
                        if (parseFloat(this.cachedWeatherObj["list"][j]["main"]["temp_max"]) > max) {
                            max = parseFloat(this.cachedWeatherObj["list"][j]["main"]["temp_max"]);
                        }
                    }
                    temperature = max;
                } else {
                    temperature = parseFloat(this.cachedWeatherObj["main"]["temp"]);
                }
                this.log("Fetched temperature " + temperature + " of type " + this.type + " for " + this.name);
            }
            return temperature;
        },

        returnHumFromCache: function () {
            var humidity;
            if (this.cachedWeatherObj && this.cachedWeatherObj["main"]) {
                humidity = parseFloat(this.cachedWeatherObj["main"]["humidity"]);
                this.log("Fetched humidity " + humidity + " of type " + this.type + " for " + this.name);
            }
            return humidity;
        },

        makeURL: function () {
            var url = "http://api.openweathermap.org/data/2.5/";
            if (this.type === "current") {
                url += "weather";
            } else {
                // Min-/Max-sensors have different endpoint
                url += "forecast";
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
         * Log the temperature to the FakeGato-service.
         * Only works if enableHistory is true and  pollingInterval > 0
         * @param temperature
         * @param humidity
         */
        addHistory: function (temperature, humidity) {
            if (this.enableHistory && this.pollingInterval > 0 && this.fakeGateHistoryService && (temperature || humidity)) {
                this.fakeGateHistoryService.addEntry({
                    time: new Date().getTime() / 1000,
                    temp: temperature,
                    humidity: humidity
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


            var services = [];
            if (this.showHumidity && this.type === "current") {
                humidityService = new Service.HumiditySensor(this.nameHumidity);
                humidityService
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on("get", this.getStateHum.bind(this));

                services = [informationService, temperatureService, humidityService];
            } else {
                services = [informationService, temperatureService];
            }

            // FakeGato
            if (this.fakeGateHistoryService) {
                services[services.length] = this.fakeGateHistoryService;
            }

            return services;

        },

        httpRequest: function (url, callback) {
            request({
                    url: url,
                    body: "",
                    method: "GET",
                    rejectUnauthorized: false
                },
                function (error, response, body) {
                    callback(error, response, body);
                })
        }

    };

