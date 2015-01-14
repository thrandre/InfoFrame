var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Store = require("../Store");
var WeatherActions = require("./WeatherActions");
var WeatherService = require("./WeatherService");
var RequestState = require("../RequestState");
var Timer = require("../Timer");
var WeatherStore = (function (_super) {
    __extends(WeatherStore, _super);
    function WeatherStore(weatherService) {
        var _this = this;
        _super.call(this);
        this.weatherService = weatherService;
        WeatherActions.getArticleData.listen(function (pl) {
            if (pl.state === 2 /* Success */) {
                _this.state = pl.data;
                _this.trigger(_this.getState());
            }
        });
        Timer.create(function () { return _this.loadState(); }).start(10 * 60 * 1000, true);
    }
    WeatherStore.prototype.loadState = function () {
        this.weatherService.getWeather("Oslo", "NO");
    };
    WeatherStore.prototype.getState = function () {
        return this.state;
    };
    return WeatherStore;
})(Store);
var weatherStore = new WeatherStore(new WeatherService("eee9d46aa90c56ff8b116ab88f2a5e3f"));
module.exports = weatherStore;
//# sourceMappingURL=WeatherStore.js.map