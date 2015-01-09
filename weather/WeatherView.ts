import WeatherProps = require("./WeatherProps");
import TReact = require( "../TReact" );

class WeatherView extends TReact.Component<WeatherProps, any> {

	render(): React.ReactElement<WeatherProps>
	{
		return TReact.jsx(require("./WeatherView.jsx"), this.props);
	}

}

var WeatherViewClass = TReact.createClass(WeatherView);

export = WeatherViewClass;
