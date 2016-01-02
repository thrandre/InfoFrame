///<reference path="typings/tsd.d.ts" />

import * as Request from "superagent";
import Enumerable from "./Enumerable";
import * as Moment from "moment";

import { WeatherModel } from "./WeatherModel";

namespace WeatherServiceResponse {

    export interface Coord {
        lon: number;
        lat: number;
    }

    export interface Sys {
        population: number;
    }

    export interface City {
        id: number;
        name: string;
        coord: Coord;
        country: string;
        population: number;
        sys: Sys;
    }

    export interface Main {
        temp: number;
        temp_min: number;
        temp_max: number;
        pressure: number;
        sea_level: number;
        grnd_level: number;
        humidity: number;
        temp_kf: number;
    }

    export interface Weather {
        id: number;
        main: string;
        description: string;
        icon: string;
    }

    export interface Clouds {
        all: number;
    }

    export interface Wind {
        speed: number;
        deg: number;
    }

    export interface Rain {
		[id: string]: number;
    }

    export interface Sys2 {
        pod: string;
    }

    export interface List {
        dt: number;
        main: Main;
        weather: Weather[];
        clouds: Clouds;
        wind: Wind;
        rain: Rain;
        sys: Sys2;
        dt_txt: string;
    }

    export interface Root {
        city: City;
        cod: string;
        message: number;
        cnt: number;
        list: List[];
    }
}

interface WeatherServiceResult {
	description: string;
	main: string;
	icon: string;
	temperature: number;
	percipitation: number;
	windSpeed: number;
    datetime: moment.Moment;
}

export default class WeatherService {

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

	private parseWeatherData(data: WeatherServiceResponse.Root): WeatherServiceResult[] {
		return Enumerable
			.fromArray(data.list)
			.select(f => ({
				datetime: Moment.unix(f.dt),
				description: f.weather[0].description,
				main: f.weather[0].main,
				icon: this.iconMap[f.weather[0].icon.replace("n", "d")],
				temperature: Math.round(f.main.temp - 273.15),
				percipitation: (Enumerable.fromObject(f.rain || {}).firstOrDefault() || { value : 0 }).value,
				windSpeed: f.wind.speed
			}))
			.where(f => f.datetime.isBefore(Moment().add(24, "hours")))
			.toArray();
	}

	private getApiUrl(city: string, countryCode: string): string {
		return `http://api.openweathermap.org/data/2.5/forecast?q=${city},${countryCode}&APPID=${this.appId}`;
	}

	getWeather(city: string, countryCode: string): Promise<WeatherServiceResult[]> {
        return new Promise<WeatherServiceResult[]>((resolve, reject) => {
			Request
				.get(this.getApiUrl(city, countryCode))
				.accept("application/json")
				.end((err, res) => resolve(this.parseWeatherData(res.body)));
		});
	}

}
