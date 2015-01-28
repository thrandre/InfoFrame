import PureRenderMixin = require("../PureRenderMixin");
import WeatherProps = require("./WeatherProps");
import React = require("react/addons");
import TReact = require("../TReact");

class WeatherView extends TReact.Component<WeatherProps, any> implements PureRenderMixin<WeatherProps, any>
{

    shouldComponentUpdate: (nextProps: WeatherProps) => boolean;
    
    render(): React.ReactElement<WeatherProps>
    {
        console.log("Hello!");
        return TReact.jsx(require("./WeatherView.jsx"), this.props, this);
	}

}

var WeatherViewClass = TReact.createClass(WeatherView, [TReact.createMixin(PureRenderMixin)]);

export = WeatherViewClass;
