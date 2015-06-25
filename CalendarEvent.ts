/// <reference path="typings/tsd.d.ts"/>

interface CalendarEvent
{
    title: string;
    owner: string;
    start: moment.Moment;
    end: moment.Moment;
    recur: any;
}

export = CalendarEvent;