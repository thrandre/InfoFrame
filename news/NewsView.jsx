var React = require("react");

module.exports = function(data) {
	if(!data.articles) {
		return null;
	}

	var style = {
		transform: "translate(0, "+ this.state.top +"px)",
		"-webkit-transform": "translate(0, "+ this.state.top +"px)"
	};

	return (
		<div className="articles" style={style}>
			{ data.articles.map(function(article) {
				return (
					<div key={ article.id } className="article">
						<div className="time">{ article.updated.format("HH:mm") }</div>
						<div className="title">{ article.title }</div>
						<div className="summary">{ article.summary }</div>
					</div>
				);
			})}
		</div>);
};
