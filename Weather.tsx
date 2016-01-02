/// <reference path="typings/tsd.d.ts"/>

import * as React from "react";
import * as Moment from "moment";
import { WeatherModel, WeatherStatistics } from "./WeatherModel";

interface WeatherProps {
    model: WeatherModel[];
    statistics: WeatherStatistics;
}

interface WeatherCalculations {
    meanRain: number;
    meanWind: number;
    meanTemperature: number;
}

enum WeatherWarningKind {
    TEMPERATURE,
    WIND,
    RAIN
}

export default class Weather extends React.Component<WeatherProps, any> {

    doWeatherCalculations(stats: WeatherStatistics): WeatherCalculations {
        var correctedMeanRain = stats.numMeasurements > 3 ?
            (stats.sumRain - stats.minRain - stats.maxRain) / (stats.numMeasurements-2) :
            stats.numMeasurements > 0 ? stats.sumRain / stats.numMeasurements : 0;

        var correctedMeanWind = stats.numMeasurements > 3 ?
            (stats.sumWind - stats.minWind - stats.maxWind) / (stats.numMeasurements-2) :
            stats.numMeasurements > 0 ? stats.sumWind / stats.numMeasurements : 0;

        var correctedMeanTemperature = stats.numMeasurements > 3 ?
            (stats.sumTemperature - stats.minTemperature - stats.maxTemperature) / (stats.numMeasurements-2) :
            stats.numMeasurements > 0 ? stats.sumTemperature / stats.numMeasurements : 0;

        return {
            meanRain: correctedMeanRain,
            meanWind: correctedMeanWind,
            meanTemperature: correctedMeanTemperature
        };
    }

    shouldWarn(forecast: WeatherModel, kind: WeatherWarningKind, weatherCalculations: WeatherCalculations): boolean {
        var std = (val, mean) => Math.pow(val-mean, 2);

        if(kind === WeatherWarningKind.TEMPERATURE) {
            return std(forecast.temperature, weatherCalculations.meanTemperature) > 25;
        }

        if(kind === WeatherWarningKind.WIND) {
            return std(forecast.windSpeed, weatherCalculations.meanWind) > 10;
        }

        return std(forecast.percipitation, weatherCalculations.meanRain) > 20;
    }

    render() {
        var model = this.props.model;

        if(!model) {
            return null;
        }

        var calculations = this.doWeatherCalculations(this.props.statistics);

        var currentWeather = model[0];
        var forecasts = model.slice(1);

        var fixed = (str: string, len: number) => {
            var pad = Array.apply(null, Array(len-str.length)).map(s => "-");
            return  (
                <span>
                    <span className="hidden">{ pad }</span>
                    { str }
                </span>
            );
        };

        return  <div className="weather">
                    <div className="currentWeather">
                        <div className={["temperature", this.shouldWarn(currentWeather, WeatherWarningKind.TEMPERATURE, calculations) ? "warning" : ""].join(" ")}>
                            <i className={ "wi " + currentWeather.icon }></i>
                            { [currentWeather.temperature.toFixed(1), '\u00b0', 'C'] }
                        </div>
                        <div className="details">
                            <span className={["wind", this.shouldWarn(currentWeather, WeatherWarningKind.WIND, calculations) ? "warning" : ""].join(" ")}>
                                <i className="wi wi-right"></i>
                                { [currentWeather.windSpeed.toFixed(1), " ", "m/s"] }
                            </span>
                            <span className={["percipitation", this.shouldWarn(currentWeather, WeatherWarningKind.RAIN, calculations) ? "warning" : ""].join(" ")}>
                                <i className="wi wi-sprinkles"></i>
                                { [currentWeather.percipitation.toFixed(1), " ", "mm"] }
                            </span>
                        </div>
                    </div>
                    <div className="forecasts">
                        {
                            forecasts
                                .filter((f, i) => i < 3 || i == forecasts.length-1)
                                .map((f, i) =>
                                    <div key={i+""} className="forecast">
                                        <i className={ "wi " + f.icon }></i>
                                        <span className="hour">{ f.datetime.format("HH:mm") }</span>
                                        <span className={["temperature", this.shouldWarn(f, WeatherWarningKind.TEMPERATURE, calculations) ? "warning" : ""].join(" ")}>{ [fixed(f.temperature.toFixed(1), 5), '\u00b0', "C"] }</span>
                                        <span className={["wind", this.shouldWarn(f, WeatherWarningKind.WIND, calculations) ? "warning" : ""].join(" ")}>{ [fixed(f.windSpeed.toFixed(1), 5), " ", "m/s"] }</span>
                                        <span className={["percipitation", this.shouldWarn(f, WeatherWarningKind.RAIN, calculations) ? "warning" : ""].join(" ")}>{ [fixed(f.percipitation.toFixed(1), 5), " ", "mm" ]}</span>
                                    </div>
                                )
                            }
                    </div>
                </div>;
    }

}
