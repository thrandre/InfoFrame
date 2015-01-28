var React = require("react");
var DashboardView = require("./views/DashboardView");
var Tween = require("tween.js");
var Imm = require("./Imm");
window.onload = function () {
    var data = Imm({ a: { b: { foo: 500 } } });
    var cur = data.cursor(function (x) { return x.a.b; });
    console.log(cur.get(function (x) { return x.foo; }));
    cur = cur.update(function (x) { return x.foo; }, function (v) { return v + 500; });
    console.log(cur.get(function (x) { return x.foo; }));
    React.render(React.createElement(DashboardView, {}), document.body);
    animate();
};
function animate() {
    setTimeout(function () { return requestAnimationFrame(animate); }, 100);
    Tween.update();
}
//# sourceMappingURL=App.js.map