"use strict";

var Service, Characteristic;
var temperatureService;
var request = require("request");

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-weather", "Weather", WeatherAccessory);
}

function WeatherAccessory(log, config) {
    this.log = log;
    this.name = config["name"];
    this.apikey = config["apikey"];
    this.locationByCity = config["location"];
    this.locationById = config["locationById"];
    this.locationByCoordinates = config["locationByCoordinates"];
    this.locationByZip = config["locationByZip"];
    this.lastupdate = 0;
    this.temperature = 0;
}

WeatherAccessory.prototype =
    {
        getState: function (callback) {
            // Only fetch new data once per hour
            if (this.lastupdate + (60 * 60) < (Date.now() / 1000 | 0)) {
                var url = "http://api.openweathermap.org/data/2.5/weather?APPID=" + this.apikey + "&";
                if (this.locationByCity) {
                    url += "q=" + this.locationByCity;
                } else if (this.locationById) {
                    url += "id=" + this.locationById;
                } else if (this.locationByCoordinates) {
                    url += this.locationByCoordinates;
                } else if (this.locationByZip) {
                    url += "zip=" + this.locationByZip;
                }
                
                this.httpRequest(url, function (error, response, responseBody) {
                    if (error) {
                        this.log("HTTP get weather function failed: %s", error.message);
                        callback(error);
                    } else {
                        this.log("HTTP Response", responseBody);
                        var weatherObj = JSON.parse(responseBody);
                        var kelvin = parseFloat(weatherObj.main.temp);
                        var temperature = (kelvin - 273);
                        this.temperature = temperature;
                        this.lastupdate = (Date.now() / 1000);
                        callback(null, temperature);
                    }
                }.bind(this));
            } else {
                this.log("Returning cached data", this.temperature);
                temperatureService.setCharacteristic(Characteristic.CurrentTemperature, this.temperature);
                callback(null, this.temperature);
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
                .setCharacteristic(Characteristic.SerialNumber, "XDWS13");

            temperatureService = new Service.TemperatureSensor(this.name);
            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .on("get", this.getState.bind(this));

            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({minValue: -30});

            temperatureService
                .getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({maxValue: 120});

            return [informationService, temperatureService];
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
