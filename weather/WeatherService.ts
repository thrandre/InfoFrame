import $ = require("jquery");
import WeatherData = require("./WeatherData");
import WeatherActions = require("./WeatherActions");
import RequestState = require("../RequestState");

class WeatherService
{
	constructor(private appId: string) {}

	private iconMap: {[key:string]: string} = {
		"01d": "wi-day-sunny",
		"02d": "wi-day-sunny-overcast",
		"03d": "wi-day-cloudy",
		"04d": "wi-cloudy",
		"09d": "wi-rain",
		"10d": "wi-showers",
		"11d": "wi-thunderstorm",
		"13d": "wi-snow",
		"50d": "wi-fog"
	}

	private parseWeatherData(data: any): WeatherData
	{
		return {
			description: data.weather[0].description,
			main: data.weather[0].main,
			icon: this.iconMap[data.weather[0].icon.replace("n", "d")],
			temperature: Math.round(data.main.temp - 273.15),
			percipitation: data.rain ? data.rain["3h"] : 0,
			windSpeed: data.wind.speed
		};
	}

	private getApiUrl(city: string, countryCode: string): string
	{
		return "http://api.openweathermap.org/data/2.5/weather?q=" + city + "," + countryCode + "&APPID=" + this.appId + "&callback=?";
	}

	getWeather(city: string, countryCode: string): Thenable<WeatherData>
	{
        WeatherActions.getArticleData.trigger({ state: RequestState.Pending });
        return $.getJSON(this.getApiUrl(city, countryCode)).then((data: any) => WeatherActions.getArticleData.trigger({ data: this.parseWeatherData(data), state: RequestState.Success }));
	}
}

export = WeatherService;