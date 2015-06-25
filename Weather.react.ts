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
    
    return jsx(`
        <div className="weather">
             <div className="temperature">
                <i className={ "wi " + props.icon }></i>
                { props.temperature.toFixed(1) }&deg;
            </div>
            <div className="details">
                <span className="wind">
                    <i className="wi wi-right"></i>
                    { props.windSpeed.toFixed(2) } m/s
                </span>
                <span className="percipitation">
                    <i className="wi wi-sprinkles"></i>
                    { props.percipitation.toFixed(2) } mm
                </span>
            </div>
        </div>
    `);
});

export = WeatherView;