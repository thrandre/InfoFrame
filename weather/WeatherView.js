var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var TReact = require("../TReact");
var WeatherView = (function (_super) {
    __extends(WeatherView, _super);
    function WeatherView() {
        _super.apply(this, arguments);
    }
    WeatherView.prototype.render = function () {
        return TReact.jsx(require("./WeatherView.jsx"), this.props);
    };
    return WeatherView;
})(TReact.Component);
var WeatherViewClass = TReact.createClass(WeatherView);
module.exports = WeatherViewClass;
//# sourceMappingURL=WeatherView.js.map