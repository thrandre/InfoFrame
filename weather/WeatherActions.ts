﻿import Action = require("../Action");
import RequestAction = require("../RequestAction");
import WeatherData = require("./WeatherData");

class WeatherActions {
    getWeatherData = new RequestAction<WeatherData>();
}

var weatherActions = new WeatherActions();

export = weatherActions;