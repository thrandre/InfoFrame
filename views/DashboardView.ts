import WeatherStore = require("../weather/WeatherStore");
import WeatherProps = require("../weather/WeatherProps");
import ClockProps = require("../viewmodels/ClockProps");
import DashboardProps = require("../viewmodels/DashboardProps");
import TReact = require("../TReact");
import ClockStore = require("../stores/ClockStore");
import NewsStore = require("../news/NewsStore");
import NewsProps = require("../news/NewsProps");

class DashboardView extends TReact.Component<any, DashboardProps> {

	getInitialState(): DashboardProps
	{
	    return {
	        clockProps: ClockStore.getState(),
	        weatherProps: WeatherStore.getState(),
	        newsProps: NewsStore.getState()
	    };
	}

	componentDidMount()
	{
		ClockStore.listen(this.handleClockStoreChange);
		WeatherStore.listen(this.handleWeatherStoreChange);
	    NewsStore.listen(this.handleNewsStoreChange);
	}

	handleClockStoreChange(payload: ClockProps)
	{
		this.setState({ clockProps: payload });
	}

	handleWeatherStoreChange(payload: WeatherProps)
	{
        this.setState({ weatherProps: payload });
	}

    handleNewsStoreChange(payload: NewsProps)
    {
        this.setState({ newsProps: payload });
    }

    render(): React.ReactElement<any>
    {
        return TReact.jsx(require("./jsx/DashboardView.jsx"), this.state, this);
	}
}

var DashboardViewClass = TReact.createClass(DashboardView);

export = DashboardViewClass;