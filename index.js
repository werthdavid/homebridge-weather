"use strict";

var Service, Characteristic, FakeGatoHistoryService;
var temperatureService;
var humidityService;
var request = require("request");
var os = require("os");

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
    if (config["showTemperature"] != null) {
        this.showTemperature = config["showTemperature"];
    } else {
        this.showTemperature = true;
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
    this.unit = config["unit"] || "metric";
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

            if (this.showTemperature && (this.type === "current" || this.type === "max" || this.type === "min")) {
                // Update Temperature
                this.getStateTemp(function (error, temperature) {
                    if (!error && temperature != null) {
                        temperatureService.setCharacteristic(Characteristic.CurrentTemperature, temperature);
                    }
                }.bind(this));
            }

            // Update Humidity if configured
            if (this.showHumidity && this.type === "current") {
                this.getStateHum(function (error, humidity) {
                    if (!error && humidity != null) {
                        humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, humidity);
                    }
                }.bind(this));
            }

            if (this.type === "clouds") {
                this.getStateClouds(function (error, value) {
                    if (!error && value != null) {
                        humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
                    }
                }.bind(this));
            }

            if (this.type === "sun") {
                this.getStateSun(function (error, value) {
                    if (!error && value != null) {
                        humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
                    }
                }.bind(this));
            }

            if (this.type === "windspeed") {
                this.getStateWindspeed(function (error, value) {
                    if (!error && value != null) {
                        humidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
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
                        try {
                            this.setCacheObj(responseBody);
                            var temperature = this.returnTempFromCache();
                            callback(null, temperature);
                        } catch (error2) {
                            this.log("Getting Temperature failed: %s", error2, response, responseBody);
                            callback(error2);
                        }
                    }
                }.bind(this));
            } else {
                try {
                    var temperature = this.returnTempFromCache();
                    this.log("Returning cached data", temperature);
                    callback(null, temperature);
                } catch (error) {
                    this.log("Getting Temperature failed: %s", error);
                    callback(error);
                }
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
                        try {
                            this.setCacheObj(responseBody);
                            var humidity = this.returnHumFromCache();
                            callback(null, humidity);
                        } catch (error2) {
                            this.log("Getting Humidity failed: %s", error2, response, responseBody);
                            callback(error2);
                        }
                    }
                }.bind(this));
            } else {
                try {
                    var humidity = this.returnHumFromCache();
                    this.log("Returning cached data", humidity);
                    callback(null, humidity);
                } catch (error) {
                    this.log("Getting Humidity failed: %s", error);
                    callback(error);
                }
            }
        },

        getStateClouds: function (callback) {
            // Only fetch new data once per minute
            if (!this.cachedWeatherObj || this.pollingInterval > 0 || this.lastupdate + 60 < (new Date().getTime() / 1000 | 0)) {
                var url = this.makeURL();
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        try {
                            this.setCacheObj(responseBody);
                            var value = this.returnCloudinessFromCache();
                            callback(null, value);
                        } catch (error2) {
                            this.log("Getting Cloudiness failed: %s", error2, response, responseBody);
                            callback(error2);
                        }
                    }
                }.bind(this));
            } else {
                try {
                    var value = this.returnCloudinessFromCache();
                    this.log("Returning cached data", value);
                    callback(null, value);
                } catch (error) {
                    this.log("Getting Cloudiness failed: %s", error);
                    callback(error);
                }
            }
        },

        getStateSun: function (callback) {
            // Only fetch new data once per minute
            if (!this.cachedWeatherObj || this.pollingInterval > 0 || this.lastupdate + 60 < (new Date().getTime() / 1000 | 0)) {
                var url = this.makeURL();
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        try {
                            this.setCacheObj(responseBody);
                            var value = this.returnSunFromCache();
                            callback(null, value);
                        } catch (error2) {
                            this.log("Getting Sun failed: %s", error2, response, responseBody);
                            callback(error2);
                        }
                    }
                }.bind(this));
            } else {
                try {
                    var value = this.returnSunFromCache();
                    this.log("Returning cached data", value);
                    callback(null, value);
                } catch (error) {
                    this.log("Getting Sun failed: %s", error);
                    callback(error);
                }
            }
        },

        getStateWindspeed: function (callback) {
            // Only fetch new data once per minute
            if (!this.cachedWeatherObj || this.pollingInterval > 0 || this.lastupdate + 60 < (new Date().getTime() / 1000 | 0)) {
                var url = this.makeURL();
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        try {
                            this.setCacheObj(responseBody);
                            var value = this.returnWindspeedFromCache();
                            callback(null, value);
                        } catch (error2) {
                            this.log("Getting Windspeed failed: %s", error2, response, responseBody);
                            callback(error2);
                        }
                    }
                }.bind(this));
            } else {
                try {
                    var value = this.returnWindspeedFromCache();
                    this.log("Returning cached data", value);
                    callback(null, value);
                } catch (error) {
                    this.log("Getting Windspeed failed: %s", error);
                    callback(error);
                }
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
            if (this.enableHistory) {
                var temperature;
                var humidity;

                if (this.showTemperature) {
                    temperature = this.returnTempFromCache();
                }
                if (this.showHumidity && this.type === "current") {
                    humidity = this.returnHumFromCache();
                }
                this.addHistory(temperature, humidity);
            }
        },

        returnTempFromCache: function () {
            var temperature;
            if (this.cachedWeatherObj) {
                var dayNow = new Date().getDay();
                if (this.type === "min") {
                    // Unfortunately we cannot use the "16 day weather forecast" API but the "5 day / 3 hour forecast" instead.
                    // this API gives one min/max every 3 hours but we want the daily min/max so we have to iterate over all those data
                    var min = parseFloat(this.cachedWeatherObj["list"][0]["main"]["temp_min"]);
                    for (var i = 0, len = this.cachedWeatherObj["list"].length; i < len; i++) {
                        var dayThen = new Date(this.cachedWeatherObj["list"][i]["dt"] * 1000).getDay();
                        if (dayThen !== dayNow) {
                            // API returns data for 5 days, we want min/max only for today
                            break;
                        }
                        if (parseFloat(this.cachedWeatherObj["list"][i]["main"]["temp_min"]) < min) {
                            min = parseFloat(this.cachedWeatherObj["list"][i]["main"]["temp_min"]);
                        }
                    }
                    temperature = min;
                } else if (this.type === "max") {
                    var max = parseFloat(this.cachedWeatherObj["list"][0]["main"]["temp_max"]);
                    for (var j = 0, len2 = this.cachedWeatherObj["list"].length; j < len2; j++) {
                        var dayThen2 = new Date(this.cachedWeatherObj["list"][j]["dt"] * 1000).getDay();
                        if (dayThen2 !== dayNow) {
                            break;
                        }
                        if (parseFloat(this.cachedWeatherObj["list"][j]["main"]["temp_max"]) > max) {
                            max = parseFloat(this.cachedWeatherObj["list"][j]["main"]["temp_max"]);
                        }
                    }
                    temperature = max;
                } else {
                    temperature = parseFloat(this.cachedWeatherObj["main"]["temp"]);
                }
                this.log("Fetched temperature value " + temperature + "deg of type '" + this.type + "' for accessory " + this.name);
            }
            return temperature;
        },

        returnHumFromCache: function () {
            var value;
            if (this.cachedWeatherObj && this.cachedWeatherObj["main"]) {
                value = parseFloat(this.cachedWeatherObj["main"]["humidity"]);
                this.log("Fetched humidity value " + value + "% of type '" + this.type + "' for accessory " + this.name);
            }
            return value;
        },

        returnCloudinessFromCache: function () {
            var value;
            if (this.cachedWeatherObj && this.cachedWeatherObj["clouds"]) {
                value = parseFloat(this.cachedWeatherObj["clouds"]["all"]);
                this.log("Fetched cloudiness value " + value + "% of type '" + this.type + "' for accessory " + this.name);
            }
            return value;
        },

        returnSunFromCache: function () {
            var value = 0;
            if (this.cachedWeatherObj && this.cachedWeatherObj["sys"]) {
                var sunrise = parseInt(this.cachedWeatherObj["sys"]["sunrise"]);
                var sunset = parseInt(this.cachedWeatherObj["sys"]["sunset"]);
                var now = Math.round(new Date().getTime() / 1000);
                if (now > sunset) {
                    // It's already dark outside
                    value = 100;
                } else if (now > sunrise) {
                    // calculate how far though the day (where day is from sunrise to sunset) we are
                    var intervalLen = (sunset - sunrise);
                    value = ((now - sunrise) / intervalLen) * 100;
                }
                this.log("Fetched sun value " + value + "% of type '" + this.type + "' for accessory " + this.name);
            }
            return value;
        },

        returnWindspeedFromCache: function () {
            var value;
            if (this.cachedWeatherObj && this.cachedWeatherObj["wind"]) {
                value = parseFloat(this.cachedWeatherObj["wind"]["speed"]);
                this.log("Fetched windspeed value " + value + "% of type '" + this.type + "' for accessory " + this.name);
            }
            return value;
        },

        makeURL: function () {
            var url = "http://api.openweathermap.org/data/2.5/";
            if (this.type === "current" || this.type === "clouds" || this.type === "sun" || this.type === "windspeed") {
                url += "weather";
            } else {
                // Min-/Max-sensors have different endpoint
                url += "forecast";
            }

            url += "?APPID=" + this.apikey + "&units=" + this.unit + "&";
            if (this.locationByCity) {
                url += "q=" + this.locationByCity;
            } else if (this.locationById) {
                url += "id=" + this.locationById;
            } else if (this.locationByCoordinates) {
                url += this.locationByCoordinates;
            } else if (this.locationByZip) {
                url += "zip=" + this.locationByZip;
            }
            this.log.debug("Using url: %s", url);
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
                .setCharacteristic(Characteristic.SerialNumber, "Homebridge-Weather");

            temperatureService = new Service.TemperatureSensor(this.name);
            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .on("get", this.getStateTemp.bind(this));

            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({minValue: -60});

            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({maxValue: 120});


            var services = [informationService];
            if (this.showHumidity && this.type === "current") {
                humidityService = new Service.HumiditySensor(this.nameHumidity);
                humidityService
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on("get", this.getStateHum.bind(this));

                if (this.showTemperature) {
                        services[services.length] = temperatureService;
                }
                services[services.length] = humidityService;
            } else if (this.type === "clouds") {
                humidityService = new Service.HumiditySensor(this.name);
                humidityService
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on("get", this.getStateClouds.bind(this));

                services[services.length] = humidityService;
            } else if (this.type === "sun") {
                humidityService = new Service.HumiditySensor(this.name);
                humidityService
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on("get", this.getStateSun.bind(this));

                services[services.length] = humidityService;
            }  else if (this.type === "windspeed") {
                humidityService = new Service.HumiditySensor(this.name);
                humidityService
                    .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                    .on("get", this.getStateWindspeed.bind(this));

                services[services.length] = humidityService;
            } else {
                if (this.showTemperature) {
                    services[services.length] = temperatureService;
                }
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

