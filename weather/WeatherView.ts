import WeatherProps = require("./WeatherProps");
import React = require("react/addons");
import TReact = require("../TReact");

class WeatherView extends TReact.Component<WeatherProps, any>
{
    
    shouldComponentUpdate: (nextProps: WeatherProps) => boolean;
    
    render(): React.ReactElement<WeatherProps>
    {
        console.log("Hello!");
        return TReact.jsx(require("./WeatherView.jsx"), this.props, this);
	}

}

var WeatherViewClass = TReact.createClass(WeatherView, [React.addons.PureRenderMixin]);

export = WeatherViewClass;
