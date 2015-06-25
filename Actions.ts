import Action = require("./Action");
import RequestAction = require("./RequestAction");

import ClockModel = require("./viewmodels/ClockProps");
import WeatherModel = require("./viewmodels/WeatherProps");
import CalendarModel = require("./CalendarProps");

import Services = require("./Services");

class Actions
{
	setClock = new Action<ClockModel>();
	
	getWeather = new RequestAction<{ cityName: string; countryCode:string }, WeatherModel>(req => {
		return Services.weatherService.getWeather(req.cityName, req.countryCode);
	});
	
	getCalendarEvents = new RequestAction<{ calendars: {owner:string;url:string}[] }, CalendarModel>(req => {
		return Services.calendarService.getEvents(req.calendars);
	});
}

var actions = new Actions();

export = actions;