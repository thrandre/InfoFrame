/// <reference path="typings/tsd.d.ts"/>
/// <reference path="node_modules/react-jsx-anywhere/jsx.d.ts"/>

import React = require("react");
import DashboardProps = require("./viewmodels/DashboardProps");
import Component = require("./purereact/Component");

import ClockStore = require("./ClockStore");
import WeatherStore = require("./WeatherStore");
import CalendarStore = require("./CalendarStore");

import Clock = require("./Clock");
import Weather = require("./Weather");
import Calendar = require("./Calendar");

var Dashboard = Component<DashboardProps>
(
    function(props) {
        if(!this.state.clock) {
            return null;    
        }
        
        return (
            React.createElement("div", {className: "dashboard"}, 
                React.createElement("div", {className: "left"}, 
                    React.createElement(Clock.jsx, React.__spread({},  this.state.clock)), 
                    React.createElement(Calendar.jsx, React.__spread({},  this.state.calendar))
                ), 
                React.createElement(Weather.jsx, React.__spread({},  this.state.weather))
            )
        );
    },
    {
        componentWillMount: function() {
            ClockStore.listen(() => this.setState({ clock:  ClockStore.clockModel }));
            WeatherStore.listen(() => this.setState({ weather: WeatherStore.weatherModel }));
            CalendarStore.listen(() => this.setState({ calendar: { events: CalendarStore.getCalendarEvents() }}));
        },
        getInitialState: function() {
            return {
                clock: ClockStore.clockModel,
                weather: WeatherStore.weatherModel,
                calendar: {events: CalendarStore.getCalendarEvents()}
            };
        }
    }
);

export = Dashboard;