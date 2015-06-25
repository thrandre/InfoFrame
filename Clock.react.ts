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
    
    return jsx(`
        <div className="clock">
            <div className="time">
                <div className="digital">
                    <span className="hour">{ hour }</span>
                    <span>:</span>
                    <span className="minute">{ minute }</span>
                </div>
                <div className="analog">
                     <AnalogClock.jsx 
                        hour={ parseInt(hour) } 
                        minute={ parseInt(minute) } 
                        second={ parseInt(second) } />
                </div>
            </div>
            <div className="date">
                <span>{ date }</span>
            </div>
        </div>
    `);
});

export = ClockView;