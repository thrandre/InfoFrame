module Weather {

    export interface WeatherData {
        description: string;
        main: string;
        icon: string;
        temperature: number;
        percipitation: number;
        windSpeed: number;
        sunrise: Moment;
        sunset: Moment;
    }

    export interface WeatherProvider {
        getWeather( city: string, countryCode: string ): JQueryPromise<WeatherData>;
    }

    export class OpenWeatherMap implements WeatherProvider {

        constructor( private appId: string ) { }

        private translateIcon( icon: string ): string {
            switch ( icon.replace( "n", "d" ) ) {
                case "01d":
                    return "wi-day-sunny";
                case "02d":
                    return "wi-day-sunny-overcast";
                case "03d": 
                    return "wi-day-cloudy";
                case "04d":
                    return "wi-cloudy";
                case "09d":
                    return "wi-rain";
                case "10d":
                    return "wi-showers";
                case "11d":
                    return "wi-thunderstorm";
                case "13d":
                    return "wi-snow";
                case "50d":
                    return "wi-fog";
                default:
                    return "wi-cloudy";
            }
        }

        private parseWeatherData( data: any ): WeatherData {
            return {
                description: data.weather[0].description,
                main: data.weather[0].main,
                icon: this.translateIcon( data.weather[0].icon ),
                temperature: Math.round( data.main.temp - 273.15 ),
                percipitation: data.rain ? data.rain["3h"] : 0,
                windSpeed: data.wind.speed,
                sunrise: moment.unix( data.sys.sunrise ),
                sunset: moment.unix( data.sys.sunset )
            };
        }

        private getApiUrl( city: string, countryCode: string ): string {
            return "http://api.openweathermap.org/data/2.5/weather?q=" + city + "," + countryCode + "&APPID=" + this.appId + "&callback=?";
        }

        getWeather( city: string, countryCode: string ): JQueryPromise<WeatherData> {
            return $.getJSON( this.getApiUrl( city, countryCode ) )
                .then( data  => this.parseWeatherData( data ));
        }

    }
} 