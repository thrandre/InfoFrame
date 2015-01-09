import NewsProps = require("../news/NewsProps");
import WeatherProps = require("../weather/WeatherProps");
import ClockProps = require("ClockProps");

interface DashboardProps
{
    clockProps?: ClockProps;
    weatherProps?: WeatherProps;
    newsProps?: NewsProps;
}

export = DashboardProps;