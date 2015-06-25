import WeatherService = require("./WeatherService");
import CalendarService = require("./CalendarService");

class Services 
{
	weatherService = new WeatherService("");
	calendarService = new CalendarService();
}

export = new Services();