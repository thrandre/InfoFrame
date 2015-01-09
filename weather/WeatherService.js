var $ = require("jquery");
var WeatherActions = require("./WeatherActions");
var RequestState = require("../RequestState");
var WeatherService = (function () {
    function WeatherService(appId) {
        this.appId = appId;
        this.iconMap = {
            "01d": "wi-day-sunny",
            "02d": "wi-day-sunny-overcast",
            "03d": "wi-day-cloudy",
            "04d": "wi-cloudy",
            "09d": "wi-rain",
            "10d": "wi-showers",
            "11d": "wi-thunderstorm",
            "13d": "wi-snow",
            "50d": "wi-fog"
        };
    }
    WeatherService.prototype.parseWeatherData = function (data) {
        return {
            description: data.weather[0].description,
            main: data.weather[0].main,
            icon: this.iconMap[data.weather[0].icon.replace("n", "d")],
            temperature: Math.round(data.main.temp - 273.15),
            percipitation: data.rain ? data.rain["3h"] : 0,
            windSpeed: data.wind.speed
        };
    };
    WeatherService.prototype.getApiUrl = function (city, countryCode) {
        return "http://api.openweathermap.org/data/2.5/weather?q=" + city + "," + countryCode + "&APPID=" + this.appId + "&callback=?";
    };
    WeatherService.prototype.getWeather = function (city, countryCode) {
        var _this = this;
        WeatherActions.getArticleData.trigger({ state: 0 /* Pending */ });
        return $.getJSON(this.getApiUrl(city, countryCode)).then(function (data) { return WeatherActions.getArticleData.trigger({ data: _this.parseWeatherData(data), state: 2 /* Success */ }); });
    };
    return WeatherService;
})();
module.exports = WeatherService;
//# sourceMappingURL=WeatherService.js.map