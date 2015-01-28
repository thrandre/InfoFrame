import React = require("react");
import DashboardView = require("./views/DashboardView");
import Tween = require("tween.js");
import Imm = require("./Imm");

window.onload = () =>
{
    var data = Imm({ a: { b: { foo: 500 } } });

    var cur = data.cursor(x => x.a.b);

    console.log(cur.get(x => x.foo));

    cur = cur.update(x => x.foo, v => v + 500);

    console.log(cur.get(x => x.foo));

    React.render(React.createElement(DashboardView, {}), document.body);
    animate();
}

function animate()
{
    setTimeout(() => requestAnimationFrame(animate), 100);
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