var React = require("react");
var DashboardView = require("./views/DashboardView");
var Tween = require("tween.js");
window.onload = function () {
    React.render(React.createElement(DashboardView, {}), document.body);
    animate();
};
function animate() {
    setTimeout(function () { return requestAnimationFrame(animate); }, 500);
    Tween.update();
}
//# sourceMappingURL=App.js.map