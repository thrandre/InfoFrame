var React = require("react");

module.exports = function(data) {
	return (
		<div className="weather">
			<div className="wrapper">
				<div className="symbol">
					<i className={"wi " + data.icon}></i>
				</div>
				<div className="temperature">
					<span className="val">{ data.temperature }</span>
					<span className="valsymbol">&deg;C</span>
				</div>
				<div className="advanced">
					<span className="rain">
						<i className="wi wi-sprinkles"></i>
						<span className="val">{ data.percipitation }</span>
						<span className="valsymbol">mm</span>
					</span>
					<span className="wind">
						<i className="wi wi-right"></i>
						<span className="val">{ data.windSpeed }</span>
						<span className="valsymbol">m/s</span>
					</span>
				</div>
			</div>
		</div>
	);
};
