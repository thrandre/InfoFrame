/// <reference path="typings/tsd.d.ts"/>
/// <reference path="node_modules/react-jsx-anywhere/jsx.d.ts"/>

import React = require("react");
import Component = require("./purereact/Component");
import WeatherModel = require("./viewmodels/WeatherProps");

var WeatherView = Component<WeatherModel>(function(props)
{
    if(!props.temperature) {
        return null;    
    }
    
    return (
        React.createElement("div", {className: "weather"}, 
             React.createElement("div", {className: "temperature"}, 
                React.createElement("i", {className:  "wi " + props.icon}), 
                 props.temperature.toFixed(1), "°"
            ), 
            React.createElement("div", {className: "details"}, 
                React.createElement("span", {className: "wind"}, 
                    React.createElement("i", {className: "wi wi-right"}), 
                     props.windSpeed.toFixed(2), " m/s"
                ), 
                React.createElement("span", {className: "percipitation"}, 
                    React.createElement("i", {className: "wi wi-sprinkles"}), 
                     props.percipitation.toFixed(2), " mm"
                )
            )
        )
    );
});

export = WeatherView;