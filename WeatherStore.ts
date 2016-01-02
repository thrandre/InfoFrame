/// <reference path="typings/tsd.d.ts"/>

import Store, { StoreAssign } from "./Store";
import Actions from "./Actions";
import * as Moment from "moment";
import { WeatherModel, WeatherStatistics } from "./WeatherModel";

var WeatherStore = StoreAssign(new Store(), {});

class WeatherStore extends Store {
    model: WeatherModel[];
    statistics: WeatherStatistics = {
        sumTemperature: 0,
        sumRain: 0,
        sumWind: 0,
        minTemperature: 0,
        maxTemperature: 0,
        minRain: 0,
        maxRain: 0,
        minWind: 0,
        maxWind: 0,
        numMeasurements: 0,
        earliestMeasurement: Moment(0),
        latestMeasurement: Moment(0)
    };

    constructor() {
        super();
        this.bindTo(Actions.setWeather, p => this.update(p));
    }

    private updateStatistics(model: WeatherModel[]) {
        var newMeasurements = [model[0]];

        if(!newMeasurements[0].datetime.isAfter(this.statistics.latestMeasurement)) {
            console.log("Nothing new to see");
            return;
        }

        var sums = newMeasurements.reduce((c, n) => {
            return {
                temperature: c.temperature + n.temperature,
                rain: c.rain + n.percipitation,
                wind: c.wind + n.windSpeed
            };
        }, {temperature: 0, rain: 0, wind: 0});

        var temperatures = newMeasurements.map(m => m.temperature).concat([this.statistics.minTemperature, this.statistics.maxTemperature]);
        var percipitations = newMeasurements.map(m => m.percipitation).concat([this.statistics.minRain, this.statistics.maxRain]);
        var winds = newMeasurements.map(m => m.percipitation).concat([this.statistics.minWind, this.statistics.maxWind]);

        this.statistics.sumTemperature += sums.temperature;
        this.statistics.sumRain += sums.rain;
        this.statistics.sumWind += sums.wind;

        this.statistics.minTemperature = Math.min.apply(null, temperatures);
        this.statistics.maxTemperature = Math.max.apply(null, temperatures);
        this.statistics.minRain = Math.min.apply(null, percipitations);
        this.statistics.maxRain = Math.max.apply(null, percipitations);
        this.statistics.minWind = Math.min.apply(null, winds);
        this.statistics.maxWind = Math.max.apply(null, winds);

        this.statistics.numMeasurements += newMeasurements.length;
        this.statistics.latestMeasurement = newMeasurements.reverse()[0].datetime;
    }

    private update(model: WeatherModel[]) {
        this.model = model;
        this.updateStatistics(this.model);
        this.trigger();
    }
}

export default new WeatherStore();
