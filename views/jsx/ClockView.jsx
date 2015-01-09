var React = require("react");
var AnalogClockView = require("../AnalogClockView");

module.exports = function(data) {
	return (
		<div className="clock">
			<div className="wrapper">
				<div className="time">
					<div className="analog">
						<AnalogClockView hour={ parseInt(data.hour) } minute={ parseInt(data.minute) } second={ parseInt(data.second) } />
					</div>
					<div className="digital">
						<span className="hour">{ data.hour }</span>
						<span className="minute">.{ data.minute }</span>
					</div>
				</div>
				<div className="date">
					<span className="day">{ data.day } </span>
					<span className="dayOfMonth">{ data.dayOfMonth } </span>
					<span className="month">{ data.month }</span>
				</div>
			</div>
		</div>
	);
};
