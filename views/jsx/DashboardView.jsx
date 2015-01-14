var React = require("react");
var ClockView = require("../ClockView");
var WeatherView = require("../../weather/WeatherView");
var NewsView = require("../../news/NewsView");
var TravelView = require("../../travel/TravelView");

module.exports = function(data) {
	return (
		<div className="dashboard">
			<div className="main">
				<div className="quadrant">
					<ClockView { ...data.clockProps }/>
				</div>
				<div className="quadrant travel">
				</div>
				<div className="quadrant">
				  <div className="octant weather">
						<WeatherView { ...data.weatherProps } />
				  </div>
				  <div className="octant calendar">
					<div className="list">
					  <div className="row header">I DAG</div>
					  <div className="group today"></div>
					  <div className="row header">I MORGEN</div>
					  <div className="group tomorrow"></div>
					</div>
				  </div>
				</div>
				<div className="quadrant news">
					<NewsView { ...data.newsProps } />
				</div>
			</div>
			<div className="ticker">
				<TravelView { ...data.travelProps } />
			</div>
		</div>
	);
};
