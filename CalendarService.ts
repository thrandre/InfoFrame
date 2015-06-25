import $ = require("jquery");
import Moment = require("moment");
import Promises = require("es6-promise");
import Query = require("./Linq");

import Actions = require("./Actions");
import RequestState = require("./RequestState");

import CalendarModel = require("./CalendarProps");

var Promise = Promises.Promise;

interface WeatherServiceRequest 
{
	cityName: string;
	countryCode: string;	
}

interface CalendarEvent {
    title: string;
    owner: string;
    start: moment.Moment;
    end: moment.Moment;
    recur: any;
}

interface Calendar {
    url: string;
    owner: string;
}

class CalendarService {

    private parseEventData(owner: string, data: any): CalendarEvent {
        var ifNotNull = (obj: any, accessor: (obj: any) => any) => obj ? accessor(obj) : "";

        var title = ifNotNull(data[1].filter(p => p[0] === "summary")[0], o => o[3]);
        var start = ifNotNull(data[1].filter(p => p[0] === "dtstart")[0], o => Moment(o[3]));
        var end = ifNotNull(data[1].filter(p => p[0] === "dtend")[0], o => Moment(o[3]));
        var recur = ifNotNull(data[1].filter(p => p[0] === "rrule")[0], o => this.parseRecurRule(o[3], start));

        return {
            title: title,
            owner: owner,
            start: start,
            end: end,
            recur: recur
        };
    }

    parseRecurRule(recur: string, start: moment.Moment) {
        var rule: any = {};
        recur.split(";").map(r => r.split("=")).forEach(r => {
            switch (r[0]) {
                case "FREQ":
                    $.extend(rule, { freq: (<any>window).RRule[r[1]] });
                    break;
                case "INTERVAL":
                    $.extend(rule, { interval: parseInt(r[1]) });
                    break;
                case "BYDAY":
                    $.extend(rule, { byweekday: r[1].split(",").map(d => (<any>window).RRule[d]) });
                    break;
                case "UNTIL":
                    $.extend(rule, { until: Moment(r[1]).toDate() });
                    break;
                case "DTSTART":
                    $.extend(rule, { dtstart: Moment(r[1]).toDate() });
                    break;
                case "WKST":
                    $.extend(rule, { wkst: (<any>window).RRule[r[1]] });
                    break;
            }
        });

        if (!rule.dtstart) {
            rule.dtstart = start.toDate();
        }

        return rule;
    }

    shouldIncludeEvent(event: CalendarEvent, today: moment.Moment) {
        var recurMatch = false;

        if (event.recur) {
            var rule = new (<any>window).RRule(event.recur);
            recurMatch = rule.between(today.clone().startOf("day").toDate(), today.clone().endOf("day").toDate()).length > 0;
        }

        return event.start.isSame(today, "day") || event.end.isSame(today, "day") || recurMatch;
    }
    
    expandRecurringEvent(event: CalendarEvent): CalendarEvent[] {
        if(!event.recur) {
            return [event];    
        }
        
        var today = Moment().startOf("day").toDate();
        var end = Moment().add("1", "years").endOf("day").toDate();
        
        var rule = new (<any>window).RRule(event.recur);
        
        var events:any[] = rule.between(today, end);
        
        return events.map(r => {
            return {
                title: event.title,
                owner: event.owner,
                start: Moment(r),
                end: Moment(r),
                recur: null
            }
        });
    }
    
    getEvents(calendars: Calendar[]): Promise<CalendarModel> {
        var promises = calendars.map(c => <any>$.get(c.url)
            .then(data => (<any>(<any>window).ICAL.parse(data)[1][2])
                .filter(e => e[0] === "vevent")
                .map(e => this.parseEventData(c.owner, e))));
        
        var self = this;
        
        return new Promise<CalendarModel>((resolve, error) => {
            
            $.when.apply($, promises).then(function() {
                var events:CalendarEvent[] = [].concat.apply([], arguments);
                
                var allEvents = events
                    .map(e => self.expandRecurringEvent(e))
                    .reduce((curr, next) => curr.concat(next), []);
                
                resolve({ events: allEvents });
            });
            
        });
    }

}

export = CalendarService;