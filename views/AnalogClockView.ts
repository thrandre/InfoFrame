import AnalogClockProps = require( "../viewmodels/AnalogClockProps" );
import TReact = require( "../TReact" );

class ClockView extends TReact.Component<AnalogClockProps, any> {

	getHourRotation( hour: number ): number
	{
		return hour > 0 ? ( hour / 12 ) * 360 : 0;
	}

	getMinuteRotation( minute: number ): number
	{
		return minute > 0 ? ( minute / 60 ) * 360 : 0;
	}

	getSecondRotation( second: number ): number
	{
		return second > 0 ? (second / 60) * 360 : 0;
	}

	render(): React.ReactElement<AnalogClockProps>
	{
		return TReact.jsx(
			require("./jsx/AnalogClockView.jsx"),
			{	
				hourRotation: this.getHourRotation(this.props.hour), 
				minuteRotation: this.getMinuteRotation(this.props.minute), 
				secondRotation: this.getSecondRotation(this.props.second)
			}
		);
	}

}

var ClockViewClass = TReact.createClass( ClockView );

export = ClockViewClass; 