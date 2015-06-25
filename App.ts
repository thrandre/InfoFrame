/// <reference path="typings/tsd.d.ts"/>

import React = require("react");
import Dashboard = require("./Dashboard");

import Timer = require("./Timer");
import Moment = require("moment");

import Actions = require("./Actions");

import Calendar = require("./CalendarService");
import Query = require("./Linq");

var calendarConfig = { 
	calendars: [
		{
			owner: "Thomas",
			url: "http://crossorigin.me/https://sharing.calendar.live.com/calendar/private/0ec5c5e9-a270-40ab-a244-581302314b18/f7dd211a-88b0-4a5e-a963-d807a40fe6a7/cid-5d3f62a70d427c52/calendar.ics"
		},
		{
			owner: "Caroline",
			url: "http://crossorigin.me/https://sharing.calendar.live.com/calendar/private/97ab575d-b24f-454c-adc7-8247e5218994/e676ed5e-dc22-425a-94e5-b2396e146762/cid-c2490ffbe195f761/calendar.ics"
		}
	]
};

window.onload = () => {
	React.render(Dashboard(), document.body);
	
	Timer.create(() => Actions.setClock.trigger({ datetime: Moment() })).start(1000, true);
	
	Timer.create(() => {
		Actions.getWeather.load({ cityName: "Oslo", countryCode: "NO" });
		Actions.getCalendarEvents.load(calendarConfig);
	})
	.start(10 * 60 * 1000, true);
	
	var test = Query.fromArray([10, 2, 10]).distinct().toArray();
	
	console.log(test);
};