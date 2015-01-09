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
    ClockView.prototype.render = function () {
        var dt = this.props.datetime;
        return TReact.jsx(require("./jsx/ClockView.jsx"), {
            day: dt.format("dddd"),
            dayOfMonth: dt.format("Do"),
            month: dt.format("MMM"),
            hour: dt.format("HH"),
            minute: dt.format("mm"),
            second: dt.format("s")
        });
    };
    return ClockView;
})(TReact.Component);
var ClockViewClass = TReact.createClass(ClockView);
module.exports = ClockViewClass;
//# sourceMappingURL=ClockView.js.map