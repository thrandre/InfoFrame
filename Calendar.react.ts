/// <reference path="typings/tsd.d.ts"/>
/// <reference path="node_modules/react-jsx-anywhere/jsx.d.ts"/>

import React = require("react");
import Moment = require("moment");
import Component = require("./purereact/Component");
import CalendarModel = require("./CalendarProps");

var CalendarView = Component<CalendarModel>(function(props)
{
    if(!props.events) {
        return null;    
    }
    
    var formatDate = (date: moment.Moment) => {
        var today = Moment();
        
        if(date.isSame(today, "day")) {
            return "Today " + date.format("HH:mm");
        }
        
        if(date.isSame(today.clone().add(1, "days"), "day")) {
            return "Tomorrow" + date.format("HH:mm");
        }
        
        return date.fromNow();
    };
    
    return jsx(`
        <div className="calendar">
             <ul className="events">
                 {props.events.map(function(e) {
                    return (
                        <li className="event">
                            <span className="title">{e.title}</span>
                            <span className="start">{formatDate(e.start)}</span>
                        </li>
                    );
                 })}
             </ul>
        </div>
    `);
});

export = CalendarView;