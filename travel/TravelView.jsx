var React = require("react");

module.exports = function(data) {
	var style = {
		transform: "translate(0, "+ this.state.left +"px)",
		"-webkit-transform": "translate(" + this.state.left +"px, 0)"
	};

	return (
		<div className="container" style={style}>
			<div className="header">
				<span className="text">T-BANE</span>
			</div>
			<div className="entries">
				{data.map(function(entry) {
					return (
						<div className="entry">
							<span className="line">{ entry.line + entry.direction }</span>
							<span className="destination">{ entry.destination }</span>
							<span className="time">{ entry.departure }</span>
						</div>
					);
				})}
			</div>
		</div>
	);
};
