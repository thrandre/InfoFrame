/// <reference path="typings/tsd.d.ts"/>

import * as React from "react";

import Clock from "./Clock";
import Weather from "./Weather";

import Actions from "./Actions";

import { ClockModel } from "./ClockModel"
//import { WeatherModel, WeatherStatistics } from "./WeatherModel";

import ClockStore from "./ClockStore";
//import WeatherStore from "./WeatherStore";

export interface DashboardState {
    clock: ClockModel;
    //weather: WeatherModel[];
    //weatherStatistics: WeatherStatistics;
}

export default class Dashboard extends React.Component<any, DashboardState> {
    
    render() {
       
        return (
            <div className="dashboard">
                <Clock model={ this.props.clock } />
                {/*<Weather model={ this.state.weather } statistics={ this.state.weatherStatistics }/>*/}
            </div>
        );
    }

}
