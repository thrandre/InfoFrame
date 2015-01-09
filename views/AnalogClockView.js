var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var TReact = require("../TReact");
var ClockView = (function (_super) {
    __extends(ClockView, _super);
    function ClockView() {
        _super.apply(this, arguments);
    }
    ClockView.prototype.getHourRotation = function (hour) {
        return hour > 0 ? (hour / 12) * 360 : 0;
    };
    ClockView.prototype.getMinuteRotation = function (minute) {
        return minute > 0 ? (minute / 60) * 360 : 0;
    };
    ClockView.prototype.getSecondRotation = function (second) {
        return second > 0 ? (second / 60) * 360 : 0;
    };
    ClockView.prototype.render = function () {
        return TReact.jsx(require("./jsx/AnalogClockView.jsx"), {
            hourRotation: this.getHourRotation(this.props.hour),
            minuteRotation: this.getMinuteRotation(this.props.minute),
            secondRotation: this.getSecondRotation(this.props.second)
        }, this);
    };
    return ClockView;
})(TReact.Component);
var ClockViewClass = TReact.createClass(ClockView);
module.exports = ClockViewClass;
//# sourceMappingURL=AnalogClockView.js.map