import ClockProps = require("../viewmodels/ClockProps");
import TReact = require( "../TReact" );

class ClockView extends TReact.Component<ClockProps, any> {

	render(): React.ReactElement<ClockProps>
	{
		var dt = this.props.datetime;

		return TReact.jsx(
			require("./jsx/ClockView.jsx"),
			{
				day: dt.format("dddd"),
				dayOfMonth: dt.format("Do"),
				month: dt.format("MMM"),
				hour: dt.format("HH"),
				minute: dt.format("mm"),
				second: dt.format("s")
			}
		);
	}

}

var ClockViewClass = TReact.createClass(ClockView);

export = ClockViewClass;
