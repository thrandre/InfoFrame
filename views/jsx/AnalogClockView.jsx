var React = require("react");

module.exports = function(data) {

	var polarToCartesian = function(centerX, centerY, radius, angleInDegrees) {
		var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

		return {
			x: centerX + (radius * Math.cos(angleInRadians)),
			y: centerY + (radius * Math.sin(angleInRadians))
		};
	};

	var describeArc = function(x, y, radius, startAngle, endAngle) {
		var start = polarToCartesian(x, y, radius, endAngle);
		var end = polarToCartesian(x, y, radius, startAngle);

		var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";

		var d = [
		"M", start.x, start.y,
		"A", radius, radius, 0, arcSweep, 0, end.x, end.y
		].join(" ");

		return d;
	};

	return (
		<figure id="clock">
			<svg id="SvgjsSvg1000" xmlns="http://www.w3.org/2000/svg" version="1.1" width="100%" height="100%">
				<svg id="SvgjsSvg1006" viewBox="0 0 100 100" width="100%" height="100%">
					<ellipse id="SvgjsEllipse1007" rx="38.5" ry="38.5" cx="50" cy="50" stroke="#ffffff" strokeWidth="10" fillOpacity="0"></ellipse>
					<rect id="SvgjsRect1008" width="7" height="20" x="46.5" y="30" fill="#ffffff" transform={"rotate( " + data.hourRotation + " 50 50)"}></rect>
					<ellipse id="SvgjsEllipse1009" rx="3.5" ry="3.5" cx="50" cy="50" fill="#ffffff"></ellipse>
					<rect id="SvgjsRect1010" width="5" height="25" x="47.5" y="26" fill="#ffffff" transform={"rotate( " + data.minuteRotation + " 50 50)"}></rect>
					<path id="SvgjsPath1011" d={describeArc(50, 50, 48.5, 0, data.secondRotation)} stroke="#ffffff" strokeWidth="3" fillOpacity="0"></path>
				</svg>
			</svg>
		</figure>
	);
};
