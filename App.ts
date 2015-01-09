import React = require("react");
import DashboardView = require("./views/DashboardView");
import Tween = require("tween.js");

window.onload = () =>
{
	React.render(React.createElement(DashboardView, {}), document.body);
    animate();
}

function animate()
{
    requestAnimationFrame(animate);
    Tween.update();
}

/*var noCacheUrl = (url: string) =>
{
	var noCache = url,
		split = url.split("?");

	if (split.length > 1)
	{
		noCache = split[0];
	}

	return noCache + "?" + Math.random();
};*/