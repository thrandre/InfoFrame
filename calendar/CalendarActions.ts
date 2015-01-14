import Actions = require("../Actions");
import RequestAction = require("../RequestAction");
import EventData = require("EventData");

class CalendarActions extends Actions {
    getArticleData = new RequestAction<EventData[]>();
}

var calendarActions = new CalendarActions();

export = calendarActions;