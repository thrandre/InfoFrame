/// <reference path="typings/tsd.d.ts"/>
/// <reference path="node_modules/react-jsx-anywhere/jsx.d.ts"/>

import React = require("react");
import ClockModel = require("./viewmodels/ClockProps");
import Component = require("./purereact/Component");

import AnalogClock = require("./AnalogClock");

var ClockView = Component<ClockModel>(function(props)
{
    var hour = props.datetime.format("HH");
    var minute = props.datetime.format("mm");
    var second = props.datetime.format("ss");
    
    var date = props.datetime.format("dddd, Do MMMM YYYY");
    
    return (
        React.createElement("div", {className: "clock"}, 
            React.createElement("div", {className: "time"}, 
                React.createElement("div", {className: "digital"}, 
                    React.createElement("span", {className: "hour"},  hour ), 
                    React.createElement("span", null, ":"), 
                    React.createElement("span", {className: "minute"},  minute )
                ), 
                React.createElement("div", {className: "analog"}, 
                     React.createElement(AnalogClock.jsx, {
                        hour:  parseInt(hour), 
                        minute:  parseInt(minute), 
                        second:  parseInt(second) })
                )
            ), 
            React.createElement("div", {className: "date"}, 
                React.createElement("span", null,  date )
            )
        )
    );
});

export = ClockView;