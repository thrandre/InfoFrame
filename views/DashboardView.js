var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var WeatherStore = require("../weather/WeatherStore");
var TReact = require("../TReact");
var ClockStore = require("../stores/ClockStore");
var NewsStore = require("../news/NewsStore");
var DashboardView = (function (_super) {
    __extends(DashboardView, _super);
    function DashboardView() {
        _super.apply(this, arguments);
    }
    DashboardView.prototype.getInitialState = function () {
        return {
            clockProps: ClockStore.getState(),
            weatherProps: WeatherStore.getState(),
            newsProps: NewsStore.getState()
        };
    };
    DashboardView.prototype.componentDidMount = function () {
        ClockStore.listen(this.handleClockStoreChange);
        WeatherStore.listen(this.handleWeatherStoreChange);
        NewsStore.listen(this.handleNewsStoreChange);
    };
    DashboardView.prototype.handleClockStoreChange = function (payload) {
        this.setState({ clockProps: payload });
    };
    DashboardView.prototype.handleWeatherStoreChange = function (payload) {
        this.setState({ weatherProps: payload });
    };
    DashboardView.prototype.handleNewsStoreChange = function (payload) {
        this.setState({ newsProps: payload });
    };
    DashboardView.prototype.render = function () {
        return TReact.jsx(require("./jsx/DashboardView.jsx"), this.state, this);
    };
    return DashboardView;
})(TReact.Component);
var DashboardViewClass = TReact.createClass(DashboardView);
module.exports = DashboardViewClass;
//# sourceMappingURL=DashboardView.js.map