///<reference path="typings/tsd.d.ts" />

export interface WeatherStatistics {
    sumTemperature: number;
    sumRain: number;
    sumWind: number;
    minTemperature: number;
    maxTemperature: number;
    minRain: number;
    maxRain: number;
    minWind: number;
    maxWind: number;
    numMeasurements: number;
    earliestMeasurement: moment.Moment;
    latestMeasurement: moment.Moment;
}

export interface WeatherModel {
    datetime: moment.Moment;
    temperature: number;
    icon: string;
    percipitation: number;
    windSpeed: number;
}
