import WeatherStore = require("../weather/WeatherStore");
import WeatherProps = require("../weather/WeatherProps");
import ClockProps = require("../viewmodels/ClockProps");
import DashboardProps = require("../viewmodels/DashboardProps");
import TReact = require("../TReact");
import ClockStore = require("../stores/ClockStore");

class DashboardView extends TReact.Component<any, DashboardProps> {

	getInitialState(): DashboardProps
	{
		return {
			clockProps: ClockStore.getState(),
			weatherProps: WeatherStore.getState()
		};
	}

	componentDidMount()
	{
		ClockStore.listen(this.handleClockStoreChange);
		WeatherStore.listen(this.handleWeatherStoreChange);
	}

	handleClockStoreChange(payload: ClockProps)
	{
		this.setState({ clockProps: payload });
	}

	handleWeatherStoreChange(payload: WeatherProps)
	{
        this.setState({ weatherProps: payload });
	}

	render(): React.ReactElement<any>
	{
		return TReact.jsx(require("./jsx/DashboardView.jsx"), this.state);
	}
}

var DashboardViewClass = TReact.createClass(DashboardView);

export = DashboardViewClass;